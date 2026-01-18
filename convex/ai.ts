import { action, query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import Groq from "groq-sdk";

export const checkCache = query({
  args: { hash: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("ai_cache")
      .withIndex("by_hash", (q) => q.eq("hash", args.hash))
      .first();
    return cached ? cached.response : null;
  },
});

export const saveCache = mutation({
  args: { hash: v.string(), response: v.any() },
  handler: async (ctx, args) => {
    // Basic check to avoid duplicates if multiple clients write same cache
    const existing = await ctx.db
      .query("ai_cache")
      .withIndex("by_hash", (q) => q.eq("hash", args.hash))
      .first();

    if (!existing) {
      await ctx.db.insert("ai_cache", {
        hash: args.hash,
        response: args.response,
      });
    }
  },
});

// Rate limiting helper
const RATE_LIMIT_MS = 30000; // 30 seconds

export const smartGenerate = action({
  args: {
    courses: v.array(v.any()),
    selectedCodes: v.array(v.string()),
    preferences: v.object({
      preferredLecturers: v.array(v.string()),
      preferredDaysOff: v.array(v.string()),
      customInstructions: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // 1. Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.tokenIdentifier;

    const now = Date.now();
    // 2. Rate limiting (Database Based)
    // Fetched in step 3 to save a query

    // 3. Get user and check credits & rate limit
    const user = await ctx.runQuery(api.users.getCurrentUser, {});

    if (!user || user.credits <= 0) {
      throw new Error(
        "Insufficient credits. You need 1 token for Smart Generate.",
      );
    }

    // Strict Database Check
    if (user.lastSmartGenerateTime) {
      const diff = now - user.lastSmartGenerateTime;
      if (diff < RATE_LIMIT_MS) {
        const waitTime = Math.ceil((RATE_LIMIT_MS - diff) / 1000);
        throw new Error(
          `Please wait ${waitTime} seconds before generating again`,
        );
      }
    }

    // 4. (Skipped) Token consumption moved to after success

    // 5. Call Groq API
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // OPTIMIZATION: Minify payload to save tokens
    // Group by course code to avoid repeating name/sks/id prefix
    const optimizedCourses = args.courses.reduce((acc: any, c: any) => {
      // Only include courses that are in selectedCodes to save massive space
      if (!args.selectedCodes.includes(c.code)) return acc;

      if (!acc[c.code]) {
        acc[c.code] = {
          n: c.name, // n = name
          s: c.sks, // s = sks
          c: [], // c = classes
        };
      }
      acc[c.code].c.push({
        id: c.id,
        k: c.class, // k = kelas
        l: c.lecturer, // l = lecturer
        t: c.schedule
          .map((s: any) => `${s.day.substring(0, 3)} ${s.start}-${s.end}`)
          .join(", "), // Compact schedule string
      });
      return acc;
    }, {});

    const prompt = `You are a university schedule optimizer. Create 5 diverse, conflict-free schedules.

DATA (Minified JSON):
${JSON.stringify(optimizedCourses, null, 2)}

SELECTED CODES (Users wants ALL of these):
${args.selectedCodes.join(", ")}

USER PREFERENCES:
- Prioritize Lecturers: ${args.preferences.preferredLecturers.join(", ") || "None"}
- Avoid Days: ${args.preferences.preferredDaysOff.join(", ") || "None"}
- Note: ${args.preferences.customInstructions || "None"}

REQUIREMENTS:
1. **CRITICAL:** Try your hardest to include **ALL** selected codes.
2. **FALLBACK:** If and ONLY IF it is mathematically impossible to avoid conflicts, you may drop **AT MOST ONE** (1) subject. Minimize SKS loss.
3. No time conflicts allowed.
4. Balanced load (≤8 SKS/day).
5. Minimize early morning (<08:00).
6. Respect 'Avoid Days' if possible.
7. 5 DISTINCT VARIATIONS.

OUTPUT FORMAT (JSON ONLY):
{
  "plans": [
    {
      "name": "Plan 1: [Briefly explain strategy & if any course was dropped]",
      "courses": [ // Reconstruct full objects based on IDs
        {
          "id": "exact-id-from-input",
          "code": "CODE",
          "name": "NAME",
          "sks": 3,
          "class": "A",
          "lecturer": "Name",
          "room": "Room", // Optional if not in input
          "schedule": [{"day": "Monday", "start": "08:00", "end": "10:00"}] // Parse back from compact string
        }
      ]
    }
  ]
}

Return ONLY valid JSON.`;

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096,
      });

      const responseText = completion.choices[0]?.message?.content || "{}";

      // Parse AI response with robust fallback
      let aiResponse;
      try {
        // Step 1: Try direct parse
        aiResponse = JSON.parse(responseText);
      } catch (e) {
        // Step 2: Try regex extraction if AI added markdown or text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            aiResponse = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            throw new Error("AI returned malformed JSON structure.");
          }
        } else {
          throw new Error("AI failed to provide a JSON response.");
        }
      }

      const plans = aiResponse.plans || [];
      if (plans.length === 0) {
        throw new Error("AI generated no valid plans");
      }

      // 6. SUCCESS! Now consume token and save plans
      await ctx.runMutation(api.users.generateServiceToken, {});

      const savedPlanIds: string[] = [];

      for (let i = 0; i < Math.min(plans.length, 5); i++) {
        const plan = plans[i];
        const planId = await ctx.runMutation(api.plans.savePlan, {
          name: plan.name || `AI Plan ${i + 1}`,
          data: JSON.stringify({
            id: crypto.randomUUID(),
            name: plan.name || `AI Plan ${i + 1}`,
            courses: plan.courses,
            score: { safe: 70, risky: 10, optimal: 20 },
            analysis: "AI-generated schedule",
          }),
          isSmartGenerated: true,
          generatedBy: "ai",
        });
        savedPlanIds.push(planId);
      }

      return {
        success: true,
        planIds: savedPlanIds,
        count: savedPlanIds.length,
      };
    } catch (error: any) {
      console.error("Smart Generate error:", error);
      // Do NOT consume token here
      throw new Error(`AI generation failed: ${error.message}`);
    }
  },
});
