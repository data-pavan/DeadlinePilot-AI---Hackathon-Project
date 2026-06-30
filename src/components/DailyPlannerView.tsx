import { useState } from "react";
import { motion } from "motion/react";
import { 
  Clock, 
  Calendar, 
  RefreshCw, 
  Sparkles, 
  Coffee, 
  BookOpen, 
  Smile, 
  AlertTriangle,
  Play,
  Heart,
  ChevronRight,
  Info
} from "lucide-react";
import { ScheduleBlock, Settings } from "../types.ts";

interface DailyPlannerViewProps {
  dailyPlan: ScheduleBlock[];
  settings: Settings | null;
  onRegeneratePlan: () => Promise<void>;
}

export default function DailyPlannerView({
  dailyPlan,
  settings,
  onRegeneratePlan
}: DailyPlannerViewProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegeneratePlan();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Calculate stats from schedule
  const totalBlocks = dailyPlan.length;
  const deepWorkBlocks = dailyPlan.filter(b => b.type === "deep_work");
  const totalWorkHours = deepWorkBlocks.reduce((acc, block) => {
    const [sh, sm] = block.start_time.split(":").map(Number);
    const [eh, em] = block.end_time.split(":").map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);
    return acc + duration / 60;
  }, 0);

  const bufferBlocks = dailyPlan.filter(b => b.type === "buffer");
  const totalBufferHours = bufferBlocks.reduce((acc, block) => {
    const [sh, sm] = block.start_time.split(":").map(Number);
    const [eh, em] = block.end_time.split(":").map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);
    return acc + duration / 60;
  }, 0);

  // Helper to determine if a block is active based on current time (HH:MM)
  const isBlockActive = (startTime: string, endTime: string) => {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    
    const blockStartMin = sh * 60 + sm;
    const blockEndMin = eh * 60 + em;
    
    return currentMin >= blockStartMin && currentMin < blockEndMin;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 text-left"
    >
      {/* Dashboard Plan Header Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-800 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Today's Plan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Intelligent hourly task planning that matches your daily goals.
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {isRegenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-300" />
          )}
          <span>{isRegenerating ? "Updating Plan..." : "Update Plan"}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Focus Hours</span>
          <span className="font-display font-bold text-xl text-indigo-600 block mt-1">{totalWorkHours.toFixed(1)}h</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Dedicated focus blocks</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Buffer Time</span>
          <span className="font-display font-bold text-xl text-rose-500 block mt-1">{totalBufferHours.toFixed(1)}h</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Delay safeguards</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Break Time</span>
          <span className="font-display font-bold text-xl text-emerald-500 block mt-1">
            {dailyPlan.filter(b => b.type === "break").length * 15} min
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Time to recharge</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Schedule Status</span>
          <span className="font-display font-bold text-sm text-emerald-600 block mt-1 flex items-center space-x-1.5">
            <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Optimal</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">AI schedule is live</span>
        </div>
      </div>

      {/* Main Schedule Timeline Grid */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 shadow-sm">
        <div className="flex items-center space-x-2 text-slate-500 text-xs pb-3 border-b border-slate-100">
          <Info className="w-4 h-4 text-indigo-600" />
          <span className="font-bold uppercase tracking-wider text-[10px]">DAILY SCHEDULE FOR {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>

        {dailyPlan.length === 0 ? (
          <div className="p-16 text-center border border-slate-200 border-dashed rounded-2xl bg-slate-50">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-sm text-slate-500 mb-1">No schedule created yet</h3>
            <p className="text-xs text-slate-400">Click the button above to create your schedule for today.</p>
          </div>
        ) : (
          <div className="space-y-4 relative pl-4 border-l border-slate-100">
            {dailyPlan.map((block, i) => {
              const active = isBlockActive(block.start_time, block.end_time);

              let icon = <BookOpen className="w-4 h-4" />;
              let themeClasses = "bg-white border-slate-200 hover:border-slate-300 text-slate-700";
              let badgeText = "WORK BLOCK";
              let badgeColor = "bg-indigo-50 text-indigo-600 border-indigo-100/50";

              if (block.type === "break") {
                icon = <Coffee className="w-4 h-4 text-emerald-600" />;
                themeClasses = "bg-emerald-50/20 border-emerald-100 text-slate-600";
                badgeText = "REFRESH BREAK";
                badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
              } else if (block.type === "lunch") {
                icon = <Coffee className="w-4 h-4 text-amber-600" />;
                themeClasses = "bg-amber-50/20 border-amber-100 text-slate-600";
                badgeText = "LUNCH BREAK";
                badgeColor = "bg-amber-100 text-amber-700 border-amber-200";
              } else if (block.type === "buffer") {
                icon = <Smile className="w-4 h-4 text-rose-600" />;
                themeClasses = "bg-rose-50/20 border-rose-100 text-slate-600";
                badgeText = "FLEXIBLE TIME";
                badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
              }

              return (
                <div 
                  key={i} 
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all relative shadow-sm ${
                    active ? "bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-500/10" : themeClasses
                  }`}
                >
                  {/* Left Column active indicator */}
                  {active && (
                    <div className="absolute left-0 top-0 w-1.5 h-full bg-indigo-600 rounded-l-xl" />
                  )}

                  <div className="flex items-start space-x-3 flex-1 text-left">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200 flex-shrink-0 mt-0.5">
                      {icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs sm:text-sm font-semibold ${active ? 'text-indigo-900 font-bold' : 'text-slate-800'}`}>
                          {block.title}
                        </span>
                        <span className={`text-[8px] font-semibold px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
                          {badgeText}
                        </span>
                        {active && (
                          <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white">
                            ACTIVE NOW
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">{block.description}</p>
                    </div>
                  </div>

                  {/* Right Column Time */}
                  <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                    <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                      {block.start_time} - {block.end_time}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
