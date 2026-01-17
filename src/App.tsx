import { SignInButton, useUser } from "@clerk/clerk-react";
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
import { ScheduleMaker } from "./components/ScheduleMaker";
import { AdminDashboard } from "./components/AdminDashboard";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";

function App() {
  const { isSignedIn } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const userData = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const ensureUser = useMutation(api.users.ensureUser);

  // State shared with Navbar for global navigation
  const [makerStep, setMakerStep] = useState<
    "config" | "select" | "view" | "archive"
  >("config");

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
        <div className="mb-12 text-center space-y-6">
          <div className="w-48 h-48 bg-white/50 backdrop-blur rounded-3xl overflow-hidden flex items-center justify-center mx-auto mb-8 shadow-2xl transition-transform hover:scale-105 border border-white/20">
            <img
              src="/assets/logo.webp"
              alt="KRSan Logo"
              className="w-full h-full object-contain p-4"
            />
          </div>
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
              <Button className="w-full h-12 text-base font-medium bg-blue-700 hover:bg-blue-800 text-white transition-all font-sans rounded-lg shadow-lg shadow-blue-200">
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

      <Navbar
        userData={userData as any}
        step={makerStep}
        setStep={setMakerStep}
      />

      <main className="container max-w-6xl mx-auto px-4 py-12">
        <Routes>
          <Route
            path="/"
            element={
              <ScheduleMaker
                externalStep={makerStep}
                onStepChange={setMakerStep}
                userData={userData as any}
              />
            }
          />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

      <footer className="py-10 border-t bg-white">
        <div className="container max-w-6xl mx-auto px-4 divide-y divide-slate-100">
          <div className="pb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
              <div className="h-8 w-20 overflow-hidden flex items-center justify-center">
                <img
                  src="/assets/logo.webp"
                  alt="KRSan"
                  className="h-full w-full object-contain"
                />
              </div>
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
