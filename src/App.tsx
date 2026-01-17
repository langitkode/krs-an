import { SignInButton, SignOutButton, useUser } from "@clerk/clerk-react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LogOut, CalendarRange } from "lucide-react";
import { ScheduleMaker } from "./components/ScheduleMaker";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";

function App() {
  const { isSignedIn, user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const userData = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const ensureUser = useMutation(api.users.ensureUser);

  // Sync user to Convex
  useEffect(() => {
    if (isAuthenticated) {
      ensureUser().catch((err) => console.error("Sync user error:", err));
    }
  }, [isAuthenticated, ensureUser]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
        <Toaster position="top-center" />
        <div className="mb-12 text-center space-y-4">
          <div className="w-20 h-20 bg-blue-700 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100 border-4 border-white">
            <CalendarRange className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 font-display">
            KRSan
          </h1>
          <p className="text-slate-500 max-w-sm mx-auto text-lg leading-relaxed">
            Professional schedule planning for university students. Optimized by
            AI for an elegant academic experience.
          </p>
        </div>

        <Card className="w-full max-w-md shadow-2xl border-none p-2 bg-white/80 backdrop-blur">
          <CardHeader className="text-center pb-8 pt-6">
            <CardTitle className="text-xl font-display font-semibold">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-slate-400">
              Securely sign in to manage your academic semester
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <SignInButton mode="modal">
              <Button className="w-full h-12 text-base font-medium bg-blue-700 hover:bg-blue-800 transition-all font-sans rounded-lg shadow-lg shadow-blue-200">
                Continue with Clerk
              </Button>
            </SignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 font-sans">
      <Toaster position="top-center" />
      <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-md">
        <div className="container flex h-16 max-w-6xl mx-auto items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center">
              <CalendarRange className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              KRSan
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold text-slate-900">
                {user?.fullName}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 rounded-full"
                    style={{
                      width: `${((userData?.credits ?? 0) / 5) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  {userData?.credits ?? 0}/5 Tokens
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <img
                src={user?.imageUrl}
                className="w-8 h-8 rounded-full border border-slate-200 shadow-sm"
              />
              <SignOutButton>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-100 hover:text-slate-900 rounded-full"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-12">
        <ScheduleMaker />
      </main>

      <footer className="py-10 border-t bg-white">
        <div className="container max-w-6xl mx-auto px-4 divide-y divide-slate-100">
          <div className="pb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100">
              <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
                <CalendarRange className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-bold font-display text-slate-900">
                KRSan
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono tracking-tighter">
              ELEGANT PLANNING • AI DRIVEN • ACADEMIC TOOL
            </p>
          </div>
          <div className="pt-8 text-center text-[10px] text-slate-300 font-mono tracking-widest uppercase">
            © 2026 KRSan Production • All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
