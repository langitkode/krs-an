import { SignInButton, SignOutButton, useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { History, LogOut, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  userData?: {
    isAdmin?: boolean;
    credits?: number;
  };
  step: "config" | "select" | "view" | "archive";
  setStep: (step: "config" | "select" | "view" | "archive") => void;
}

export function Navbar({ userData, step, setStep }: NavbarProps) {
  const { isSignedIn, user } = useUser();
  const isArchitect = step === "config" || step === "select" || step === "view";
  const isArchive = step === "archive";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container flex h-14 max-w-6xl mx-auto items-center justify-between px-4">
        {/* Logo & Admin Link */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <div className="h-9 w-24 overflow-hidden flex items-center justify-center">
              <img
                src="/assets/logo.webp"
                alt="KRSan Logo"
                className="h-full w-full object-contain"
              />
            </div>
          </Link>

          {userData?.isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <Shield className="w-3 h-3" />
              <span className="text-[9px] font-mono uppercase tracking-widest pt-0.5">
                Admin
              </span>
            </Link>
          )}
        </div>

        {/* Global Toggle (Athetic & Slim) */}
        <div className="absolute left-1/2 -translate-x-1/2 bg-slate-100/50 p-0.5 rounded-xl flex gap-0.5 border border-slate-200/60 shadow-inner scale-90 sm:scale-100 transition-transform">
          <Button
            variant={isArchitect ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStep("config")}
            className={`h-8 rounded-[10px] font-display font-medium px-4 text-xs transition-all ${
              isArchitect
                ? "bg-white shadow-sm ring-1 ring-slate-200 text-blue-700"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden xs:inline">Architect</span>
          </Button>
          <Button
            variant={isArchive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStep("archive")}
            className={`h-8 rounded-[10px] font-display font-medium px-4 text-xs transition-all ${
              isArchive
                ? "bg-white shadow-sm ring-1 ring-slate-200 text-blue-700"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden xs:inline">Archive</span>
          </Button>
        </div>

        {/* User Stats & Profile */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                {userData?.credits ?? 0}/5 Tokens
              </span>
              <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-700 transition-all duration-500"
                  style={{ width: `${((userData?.credits ?? 0) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {!isSignedIn ? (
            <SignInButton mode="modal">
              <Button
                size="sm"
                className="bg-blue-700 text-xs h-8 px-4 rounded-lg"
              >
                Sign In
              </Button>
            </SignInButton>
          ) : (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
              <img
                src={user.imageUrl}
                className="w-7 h-7 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                alt="Profile"
              />
              <SignOutButton>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </SignOutButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
