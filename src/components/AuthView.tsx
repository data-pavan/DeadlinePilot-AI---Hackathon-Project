import { useState } from "react";
import { ShieldAlert, Sparkles, User, Lock, ArrowRight, UserPlus, LogIn, Check } from "lucide-react";
import { api } from "../services/api.ts";

interface AuthViewProps {
  onAuthSuccess: (user: { id: number; username: string }) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const user = await api.register(username, password);
        onAuthSuccess(user);
      } else {
        const user = await api.login(username, password);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userKey: "usera" | "userb") => {
    setError(null);
    setLoading(true);
    try {
      const user = await api.login(userKey, "password");
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || "Quick login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden group">
            <Sparkles className="w-7 h-7 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </div>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-display font-extrabold text-slate-900 tracking-tight">
          DeadlinePilot<span className="text-indigo-600">.AI</span>
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500 font-semibold uppercase tracking-wider">
          {isRegister ? "Create your isolated workspace" : "Log in to your private pilot desk"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200/80 sm:rounded-2xl sm:px-10">
          
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isRegister ? (
                  <>
                    <UserPlus className="w-4 h-4" /> Create Workspace
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Log In
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Or switch view
                </span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                {isRegister ? "Already have an account? Sign In" : "New pilot? Register a free private account"}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Testing Panel for User Isolation Verification */}
        <div className="mt-6 bg-slate-100/80 rounded-2xl border border-slate-200/60 p-5 shadow-inner">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5 justify-center">
            <Check className="w-4 h-4 text-emerald-500" /> Verified User Isolation Presets
          </h3>
          <p className="text-[11px] text-slate-500 text-center leading-relaxed mb-4">
            Test the separation requirements instantly by logging in with our pre-populated accounts:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickLogin("usera")}
              disabled={loading}
              className="flex flex-col items-center justify-center p-3 bg-white hover:bg-indigo-50/20 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <span className="font-bold text-xs text-slate-800">User A</span>
              <span className="text-[10px] text-indigo-600 font-semibold mt-1">5 Isolated Tasks</span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">pass: password</span>
            </button>

            <button
              onClick={() => handleQuickLogin("userb")}
              disabled={loading}
              className="flex flex-col items-center justify-center p-3 bg-white hover:bg-indigo-50/20 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <span className="font-bold text-xs text-slate-800">User B</span>
              <span className="text-[10px] text-indigo-600 font-semibold mt-1">3 Isolated Tasks</span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">pass: password</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
