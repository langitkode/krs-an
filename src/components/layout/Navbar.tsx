import { SignInButton, SignOutButton, useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import {
  History,
  LogOut,
  Shield,
  Sparkles,
  User,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NavbarProps {
  userData?: {
    isAdmin?: boolean;
    credits?: number;
  };
  step: "config" | "select" | "view" | "archive";
  setStep: (step: "config" | "select" | "view" | "archive") => void;
  onRestoreArchitect?: () => void;
}

export function Navbar({
  userData,
  step,
  setStep,
  onRestoreArchitect,
}: NavbarProps) {
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
            onClick={() =>
              onRestoreArchitect ? onRestoreArchitect() : setStep("config")
            }
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
        {/* User Profile Popover */}
        <div className="flex items-center gap-4">
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
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative group cursor-pointer">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt pointer-events-none"></div>
                  <img
                    src={user?.imageUrl}
                    className="relative w-8 h-8 rounded-full border-2 border-white object-cover"
                    alt="Profile"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-72 p-0 mr-4 mt-2 bg-white"
                align="end"
              >
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <img
                      src={user?.imageUrl}
                      className="w-10 h-10 rounded-full border border-slate-200"
                      alt={user?.fullName || "User"}
                    />
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-slate-900 leading-none">
                        {user?.fullName}
                      </p>
                      <p className="text-xs text-slate-500 font-mono truncate max-w-[170px]">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-blue-600" />
                        Service Tokens
                      </span>
                      <span className="font-mono text-slate-500">
                        {userData?.credits ?? 0}/5 Used
                      </span>
                    </div>
                    <div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            (userData?.credits ?? 0) >= 5
                              ? "bg-red-500"
                              : "bg-blue-600"
                          }`}
                          style={{
                            width: `${Math.min(((userData?.credits ?? 0) / 5) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                        Tokens reset daily. Use them to expand schedule limits
                        beyond standard caps.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                  <SignOutButton>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </SignOutButton>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </header>
  );
}
