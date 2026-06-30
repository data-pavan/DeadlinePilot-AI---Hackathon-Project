import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Clock, 
  Compass, 
  Info,
  CheckCircle,
  X
} from "lucide-react";
import { Task, ScheduleBlock } from "../types.ts";

interface CalendarPanelProps {
  tasks: Task[];
  dailyPlan: ScheduleBlock[];
}

export default function CalendarPanel({ tasks, dailyPlan }: CalendarPanelProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [aiOverlayActive, setAiOverlayActive] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper: Get days in month
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  // Helper: Get starting day of week (0 = Sunday, 6 = Saturday)
  const getStartDayOfWeek = (y: number, m: number) => {
    return new Date(y, m, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const startDayOfWeek = getStartDayOfWeek(year, month);

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper to check if two dates are same calendar day
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // Filter tasks with deadline on a given day
  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => {
      if (task.status === "archived") return false;
      const tDate = new Date(task.deadline);
      return isSameDay(tDate, date);
    });
  };

  // Generate calendar grid array
  const gridCells = [];
  // Filler for previous month days
  for (let i = 0; i < startDayOfWeek; i++) {
    gridCells.push(null);
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push(new Date(year, month, d));
  }

  const selectedDateTasks = selectedDate ? getTasksForDay(selectedDate) : [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
    >
      {/* Calendar Grid Left */}
      <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        
        {/* Calendar Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-display font-bold text-lg text-slate-800">
              {monthNames[month]} {year}
            </h3>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* AI Overlay toggle */}
            <button
              onClick={() => setAiOverlayActive(!aiOverlayActive)}
              className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                aiOverlayActive 
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI PLAN OVERLAY: {aiOverlayActive ? "ON" : "OFF"}</span>
            </button>

            {/* Pagination */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition-all cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition-all cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-2">
          {gridCells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-16 sm:h-24 bg-slate-50/50 border border-transparent rounded-xl" />;

            const dayTasks = getTasksForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

            return (
              <div
                key={`day-${day.getTime()}`}
                onClick={() => setSelectedDate(day)}
                className={`h-16 sm:h-24 p-2 rounded-xl border cursor-pointer flex flex-col justify-between transition-all select-none relative ${
                  isSelected 
                    ? "bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-500/10" 
                    : isToday 
                    ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-md shadow-indigo-600/10" 
                    : "bg-slate-50/50 border-slate-100 hover:border-slate-300 hover:bg-white"
                }`}
              >
                {/* Day number */}
                <span className={`text-xs font-bold ${isToday ? 'text-white' : isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                  {day.getDate()}
                </span>

                {/* Day content: Tasks or AI overlay */}
                <div className="space-y-1 overflow-hidden max-h-[70%]">
                  {aiOverlayActive && isToday && (
                    <div className={`text-[7px] font-bold px-1 py-0.5 rounded text-center truncate ${
                      isToday ? 'bg-white/20 text-white' : 'bg-indigo-50 border border-indigo-100 text-indigo-600'
                    }`}>
                      ⚡ {dailyPlan.filter(b => b.type === "deep_work").length} FOCUS
                    </div>
                  )}

                  {dayTasks.length > 0 && (
                    <div className="flex flex-col space-y-1">
                      {dayTasks.slice(0, 2).map(task => {
                        let dotColor = "bg-slate-400";
                        if (task.priority === "high") dotColor = "bg-rose-500";
                        if (task.priority === "medium") dotColor = "bg-amber-500";

                        return (
                          <div key={task.id} className="flex items-center space-x-1 text-[8px] sm:text-[9px] bg-white border border-slate-200 px-1 py-0.5 rounded truncate text-slate-700 shadow-sm">
                            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
                            <span className="truncate">{task.title}</span>
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && (
                        <span className="text-[7px] text-slate-400 font-bold text-center block">+{dayTasks.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Details panel Right Column */}
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-wider">
              Day Details
            </h4>
            <span className="text-xs text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
              {selectedDate ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Select day"}
            </span>
          </div>

          {selectedDateTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs border border-slate-200 border-dashed rounded-xl bg-slate-50">
              No tasks due on this date.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {selectedDateTasks.map(task => {
                let priorityColor = "text-slate-500 bg-slate-50 border-slate-200";
                if (task.priority === "high") priorityColor = "text-rose-600 bg-rose-50 border-rose-100";
                if (task.priority === "medium") priorityColor = "text-amber-600 bg-amber-50 border-amber-100";

                return (
                  <div key={task.id} className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-2 text-left shadow-sm">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-xs font-semibold text-slate-800 line-clamp-2">{task.title}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border uppercase shrink-0 ${priorityColor}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                      <span className="font-semibold uppercase tracking-wider">Scope: {task.category}</span>
                      <span>{task.estimated_hours}h estimated</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI Schedule overlay preview inside the day detail */}
          {aiOverlayActive && selectedDate && isSameDay(selectedDate, new Date()) && dailyPlan.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center space-x-1.5 text-indigo-600 text-[10px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>AI DAILY PLAN OVERLAY</span>
              </div>
              <div className="space-y-2">
                {dailyPlan.slice(0, 3).map((block, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center text-[10px] text-slate-600">
                    <span className="truncate max-w-[140px] text-slate-700 font-semibold">{block.title}</span>
                    <span className="font-mono">{block.start_time} - {block.end_time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
