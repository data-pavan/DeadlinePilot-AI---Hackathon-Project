import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Smile, 
  Compass, 
  CheckCircle,
  HelpCircle,
  Brain,
  Info,
  ChevronRight,
  Flame,
  Power,
  Dribbble
} from "lucide-react";
import { Task } from "../types.ts";

interface FocusModeViewProps {
  tasks: Task[];
  onNavigate: (view: string) => void;
  onUpdateTask: (id: number, data: Partial<Task>) => void;
}

const MOTIVATIONS = [
  "Deep focus is a superpower. Direct all your mental energy to this single objective.",
  "Mute Slack, clear your desk, take a deep breath. You are on track.",
  "Your future self will thank you for finishing this milestone on time.",
  "Don't worry about the whole mountain. Just focus on this exact step.",
  "The planner is keeping you on track. Your only goal is to start."
];

export default function FocusModeView({
  tasks,
  onNavigate,
  onUpdateTask
}: FocusModeViewProps) {
  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "archived");
  const [selectedTaskId, setSelectedTaskId] = useState<number>(activeTasks[0]?.id || 0);

  // Timer states
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [initialDuration, setInitialDuration] = useState(25 * 60);

  const [motivationIndex, setMotivationIndex] = useState(0);
  const [breathingPulse, setBreathingPulse] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cyclic motivational change
    const interval = setInterval(() => {
      setMotivationIndex((prev) => (prev + 1) % MOTIVATIONS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Breathing pulse effect
  useEffect(() => {
    const pulse = setInterval(() => {
      setBreathingPulse((prev) => !prev);
    }, 4000); // 4s inhale, 4s exhale
    return () => clearInterval(pulse);
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          // Timer finished
          setIsRunning(false);
          alert("Focus session complete! Take a well-deserved break.");
          handleReset();
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, minutes, seconds]);

  const handleStartStop = () => {
    if (!isRunning) {
      setInitialDuration(minutes * 60 + seconds);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setMinutes(25);
    setSeconds(0);
  };

  const handleSelectDuration = (mins: number) => {
    setIsRunning(false);
    setMinutes(mins);
    setSeconds(0);
    setInitialDuration(mins * 60);
  };

  const currentTask = tasks.find(t => t.id === selectedTaskId);

  const totalRemainingSeconds = minutes * 60 + seconds;
  const progressPercent = initialDuration > 0 ? ((initialDuration - totalRemainingSeconds) / initialDuration) * 100 : 0;

  const handleCompleteTask = () => {
    if (selectedTaskId) {
      onUpdateTask(selectedTaskId, { status: "completed" });
      alert("Excellent work! Task completed ahead of deadline.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[80vh] flex flex-col items-center justify-center space-y-8 relative py-8 text-center"
    >
      {/* Background soft highlights */}
      <div className="absolute w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Focus Controls */}
      <div className="w-full max-w-xl text-center space-y-6 relative z-10">
        
        {/* Header Task Selector */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CHOOSE FOCUS OBJECTIVE</span>
          {activeTasks.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">All tasks completed! Enjoy your free time.</p>
          ) : (
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(Number(e.target.value))}
              disabled={isRunning}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {activeTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.priority.toUpperCase()})</option>
              ))}
            </select>
          )}
        </div>

        {/* Big Visual Breathing Orb Timer Ring */}
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center bg-white rounded-full border border-slate-100 shadow-sm">
          {/* Animated pulsing gradient bubble representing breathing */}
          <motion.div 
            animate={{
              scale: breathingPulse ? 1.05 : 0.95,
              opacity: breathingPulse ? 0.25 : 0.12
            }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-200 to-rose-200 blur-xl pointer-events-none"
          />

          {/* SVG Progress Ring */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="116"
              stroke="#f1f5f9"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r="116"
              stroke="#4f46e5"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 116}
              strokeDashoffset={2 * Math.PI * 116 * (1 - progressPercent / 100)}
              className="transition-all duration-300"
            />
          </svg>

          {/* Countdown Clock Face */}
          <div className="text-center space-y-1 relative z-10">
            <span className="text-5xl font-display font-extrabold text-slate-800 tracking-tight">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              {breathingPulse ? "Inhale..." : "Exhale..."}
            </span>
          </div>
        </div>

        {/* Motivation Quote Banner */}
        <AnimatePresence mode="wait">
          <motion.p 
            key={motivationIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs sm:text-sm text-slate-500 italic max-w-md mx-auto leading-relaxed h-10"
          >
            "{MOTIVATIONS[motivationIndex]}"
          </motion.p>
        </AnimatePresence>

        {/* Duration Selectors Preset Badges */}
        <div className="flex flex-wrap justify-center gap-2">
          <button 
            disabled={isRunning}
            onClick={() => handleSelectDuration(15)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
              minutes === 15 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
            }`}
          >
            15M BREATH
          </button>
          <button 
            disabled={isRunning}
            onClick={() => handleSelectDuration(25)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
              minutes === 25 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
            }`}
          >
            25M POMODORO
          </button>
          <button 
            disabled={isRunning}
            onClick={() => handleSelectDuration(50)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
              minutes === 50 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
            }`}
          >
            50M FOCUS
          </button>
          <button 
            disabled={isRunning}
            onClick={() => handleSelectDuration(90)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
              minutes === 90 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
            }`}
          >
            90M DEEP WORK
          </button>
        </div>

        {/* Buttons Play/Pause Controls */}
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={handleReset}
            className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-sm cursor-pointer"
            title="Reset session"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handleStartStop}
            className="p-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105 cursor-pointer"
          >
            {isRunning ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
          </button>

          <button
            onClick={handleCompleteTask}
            disabled={!currentTask}
            className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-emerald-600 hover:text-emerald-700 transition-all disabled:opacity-40 shadow-sm cursor-pointer"
            title="Mark current task completed"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Close and exit focus */}
        <div className="pt-6 border-t border-slate-100 flex justify-center">
          <button
            onClick={() => onNavigate("dashboard")}
            className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-all flex items-center space-x-1 cursor-pointer"
          >
            <Power className="w-4 h-4 text-rose-500" />
            <span>Leave Focus Mode</span>
          </button>
        </div>

      </div>
    </motion.div>
  );
}
