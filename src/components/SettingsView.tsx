import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Settings as SettingsIcon, 
  RefreshCw, 
  Check, 
  HelpCircle, 
  Sparkles, 
  Clock, 
  Zap,
  Power,
  Sliders,
  Shield,
  Eye,
  Github
} from "lucide-react";
import { Settings } from "../types.ts";
import { api } from "../services/api.ts";

interface SettingsViewProps {
  settings: Settings | null;
  onRefresh: () => void;
  onSaveSettings: (settings: Settings) => Promise<boolean>;
}

export default function SettingsView({
  settings,
  onRefresh,
  onSaveSettings
}: SettingsViewProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [userName, setUserName] = useState("Pilot");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [peakPeriod, setPeakPeriod] = useState("morning");
  const [autoRescue, setAutoRescue] = useState(0); // 0 or 1
  const [breakInterval, setBreakInterval] = useState(60);
  const [bufferRatio, setBufferRatio] = useState(15);
  const [focusStreak, setFocusStreak] = useState(0);

  useEffect(() => {
    if (settings) {
      setUserName(settings.user_name || "Pilot");
      setWorkStart(settings.work_start_time || settings.work_hours_start || "09:00");
      setWorkEnd(settings.work_end_time || settings.work_hours_end || "18:00");
      setPeakPeriod(settings.peak_focus_period || "morning");
      setAutoRescue(settings.auto_rescue_enabled !== undefined ? settings.auto_rescue_enabled : (settings.rescue_mode_enabled === "true" ? 1 : 0));
      setBreakInterval(settings.break_interval_minutes || 60);
      setBufferRatio(settings.buffer_ratio_percent || 15);
      setFocusStreak(settings.focus_streak_days || 0);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const payload: Settings = {
      user_name: userName,
      work_start_time: workStart,
      work_end_time: workEnd,
      peak_focus_period: peakPeriod,
      auto_rescue_enabled: autoRescue,
      break_interval_minutes: Number(breakInterval),
      buffer_ratio_percent: Number(bufferRatio),
      focus_streak_days: focusStreak
    };

    try {
      const isOk = await onSaveSettings(payload);
      if (isOk) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save settings to the database.");
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
    >
      {/* Primary configuration column */}
      <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="font-display font-bold text-lg text-slate-800">
              Planner Preferences
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
            AI Assistant Controls
          </span>
        </div>

        {/* Settings form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* User Name field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Name / Nickname</label>
            <input
              type="text"
              required
              placeholder="e.g. Pilot"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
            />
          </div>

          {/* Work Hours Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Work Hours Start</label>
              <input
                type="text"
                required
                placeholder="09:00"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Work Hours End</label>
              <input
                type="text"
                required
                placeholder="17:00"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Peak Focus selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peak Focus Period</label>
            <div className="grid grid-cols-3 gap-3">
              {["morning", "afternoon", "night"].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPeakPeriod(p)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all uppercase text-center block cursor-pointer ${
                    peakPeriod === p 
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                      : "bg-white text-slate-500 border-slate-200 hover:text-slate-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Break and Buffer Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Breaks Interval</label>
              <select
                value={breakInterval}
                onChange={(e) => setBreakInterval(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={30}>Every 30 Minutes</option>
                <option value={60}>Every 60 Minutes</option>
                <option value={90}>Every 90 Minutes</option>
                <option value={120}>Every 120 Minutes</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Buffer Cushion Ratio</label>
              <select
                value={bufferRatio}
                onChange={(e) => setBufferRatio(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={5}>5% - High Stress / Minimal Cushion</option>
                <option value={10}>10% - Standard Pace</option>
                <option value={15}>15% - Recommended / Safe Buffer</option>
                <option value={20}>20% - Relaxed / Max Buffer</option>
              </select>
            </div>
          </div>

          {/* Auto Rescue Mode switch */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Automatic Schedule Adjustment</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Allow the AI Assistant to automatically propose task adjustments when scheduled items clash with new, higher priority deadlines.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoRescue(autoRescue === 1 ? 0 : 1)}
              className={`w-12 h-6 rounded-full p-1 transition-all relative shrink-0 cursor-pointer ${
                autoRescue === 1 ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-all ${
                autoRescue === 1 ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Submit CTA */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : success ? (
                <Check className="w-4 h-4 text-emerald-400 font-extrabold" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{loading ? "Saving..." : success ? "Preferences Saved!" : "Save Preferences"}</span>
            </button>
          </div>

        </form>
      </div>

      {/* Profile summary status details column */}
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <SettingsIcon className="w-4 h-4 text-indigo-600" />
            <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-wider">
              System Status
            </h4>
          </div>

          <div className="space-y-3 text-[11px] text-slate-600 text-left">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400 uppercase">Focus Level:</span>
              <span className="text-slate-800 font-bold">Personalized Optimization</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400 uppercase">Focus Streak:</span>
              <span className="text-emerald-600 font-bold flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" /> {focusStreak} Days Running
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400 uppercase">Database:</span>
              <span className="text-slate-800">Express + SQLite</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400 uppercase">AI Engine:</span>
              <span className="text-indigo-600 font-bold uppercase">Gemini Flash</span>
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
