import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, 
  Calendar, 
  Compass, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Play, 
  Activity, 
  RefreshCw,
  FolderKanban,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Cpu,
  History,
  TrendingDown,
  User,
  Zap,
  ArrowRight
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Task, AnalyticsSummary, ScheduleBlock, Settings } from "../types.ts";
import { api } from "../services/api.ts";

interface DashboardViewProps {
  tasks: Task[];
  analytics: AnalyticsSummary | null;
  dailyPlan: ScheduleBlock[];
  settings: Settings | null;
  onNavigate: (view: string) => void;
  onRefresh: () => void;
  onTriggerPrioritizeAll: () => void;
}

export default function DashboardView({
  tasks,
  analytics,
  dailyPlan,
  settings,
  onNavigate,
  onRefresh,
  onTriggerPrioritizeAll
}: DashboardViewProps) {
  
  // States for autonomous AI recommendations and logs
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [simulation, setSimulation] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  // Fetch proactive AI recommendations and chronological logs
  const fetchAnalysisAndLogs = async (force?: boolean) => {
    setAnalysisLoading(true);
    setLogsLoading(true);
    try {
      const data = await api.getWorkspaceAnalysis(force);
      setAnalysis(data);
    } catch (err) {
      console.error("Workspace analysis fetch failed:", err);
    } finally {
      setAnalysisLoading(false);
    }

    try {
      const logData = await api.getAILogs();
      setLogs(logData);
    } catch (err) {
      console.error("Logs fetch failed:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysisAndLogs();
  }, [tasks]);

  const handleForceRefreshAnalysis = async () => {
    await fetchAnalysisAndLogs(true);
    onRefresh(); 
  };

  const handleTriggerSimulation = async () => {
    setShowSimModal(true);
    setSimulating(true);
    try {
      const data = await api.simulateDay();
      setSimulation(data);
    } catch (err) {
      console.error("Pathway simulation failed:", err);
    } finally {
      setSimulating(false);
    }
  };

  const handleRecAction = (actionType: string) => {
    if (actionType === 'reschedule') {
      onNavigate("planner");
    } else if (actionType === 'prioritize') {
      onNavigate("rescue");
    } else if (actionType === 'focus') {
      onNavigate("tasks");
    } else if (actionType === 'break') {
      onNavigate("planner");
    } else {
      onNavigate("tasks");
    }
  };

  const activeTasks = tasks ? tasks.filter(t => t.status !== "completed" && t.status !== "archived") : [];
  
  // Format history data for progress chart
  const chartData = analytics ? analytics.history.map(pt => ({
    date: pt.date.slice(5), 
    Score: pt.productivity_score,
    Completed: pt.completed_tasks,
    AtRisk: pt.tasks_at_risk
  })) : [];

  const PIE_COLORS = ["#4F46E5", "#6366F1", "#F59E0B", "#22C55E", "#EF4444", "#a855f7"];

  const getRemainingTime = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - new Date().getTime();
    if (diff <= 0) return { text: "Overdue", isPast: true };
    const hours = Math.round(diff / (1000 * 60 * 60));
    if (hours < 24) return { text: `${hours}h remaining`, isPast: false, isUrgent: true };
    const days = Math.round(hours / 24);
    return { text: `${days}d remaining`, isPast: false, isUrgent: false };
  };

  // Stats count computations
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === "completed").length;
  const highPriorityCount = activeTasks.filter(t => t.priority === "high").length;
  
  const dueTodayCount = activeTasks.filter(t => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    return diffMs > -12 * 60 * 60 * 1000 && diffMs < 24 * 60 * 60 * 1000;
  }).length;

  const recommendationsCount = analysis?.recommendations?.length ?? 4;

  const riskPercent = analysis?.risk_meter?.risk_score ?? analytics?.riskScore ?? 0;
  const overdueCount = analytics?.overdueCount ?? 0;
  const highRiskCount = analytics?.highRiskCount ?? 0;

  // Deadline risk logic based on user rules
  let riskStatus: "safe" | "warning" | "urgent" = "safe";
  if (overdueCount > 0 || highRiskCount > 1 || riskPercent > 60) {
    riskStatus = "urgent";
  } else if (highRiskCount > 0 || riskPercent > 30) {
    riskStatus = "warning";
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-8 pb-12"
    >
      
      {/* Top Welcome / Orientation Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
            Good Morning, {settings?.user_name || "Pilot"} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {tasks.length === 0 ? (
              <span className="text-indigo-600 font-bold block mt-1">
                Welcome to DeadlinePilot AI! Let's create your first task.
              </span>
            ) : (
              <>
                You have <strong className="text-slate-800 font-semibold">{activeTasks.length} tasks</strong> today. 
                {highRiskCount > 0 ? (
                  <span> <strong className="text-rose-600 font-semibold">{highRiskCount} tasks</strong> need your attention.</span>
                ) : (
                  <span> Your schedule is looking clean and balanced!</span>
                )}
                {" AI has prepared today's plan."}
              </>
            )}
          </p>
        </div>
        <button 
          onClick={() => onNavigate(tasks.length === 0 ? "tasks" : "planner")}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
        >
          <span>{tasks.length === 0 ? "Create First Task" : "View Today's Plan"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Deadline Risk Notification Callout */}
      <div>
        {riskStatus === "urgent" && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 premium-shadow">
            <div className="flex items-center space-x-3 text-left">
              <span className="text-2xl">Urgent 🚨</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Finish these tasks first.</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  You have {overdueCount} overdue tasks and {highRiskCount} tasks at high risk of delay. Let's fix your schedule now.
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate("rescue")}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-all whitespace-nowrap"
            >
              Fix My Schedule
            </button>
          </div>
        )}

        {riskStatus === "warning" && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 premium-shadow">
            <div className="flex items-center space-x-3 text-left">
              <span className="text-2xl">Warning ⚠️</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">You may miss {highRiskCount} deadlines.</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Your current workload is slightly elevated. Let's reorganize to keep you perfectly on path.
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate("rescue")}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white transition-all whitespace-nowrap"
            >
              Fix My Schedule
            </button>
          </div>
        )}

        {riskStatus === "safe" && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 premium-shadow">
            <div className="flex items-center space-x-3 text-left">
              <span className="text-2xl">Great 👍</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">You're on track.</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  All your active deadlines have sufficient time buffers. Keep up the amazing work!
                </p>
              </div>
            </div>
            <button 
              onClick={() => handleForceRefreshAnalysis()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all whitespace-nowrap"
            >
              Check Again
            </button>
          </div>
        )}
      </div>

      {/* Bento Grid of Simple Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Today's Tasks */}
        <div className="p-5 premium-card relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-3xl font-display font-extrabold text-slate-900">{totalTasksCount}</span>
              <p className="text-xs font-medium text-slate-500 mt-1">Today's Tasks</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-4 border-t border-slate-100 pt-2 flex justify-between">
            <span>Active Tasks</span>
            <span className="font-semibold text-slate-700">{activeTasks.length} Left</span>
          </div>
        </div>

        {/* Card 2: Deadline Today */}
        <div className="p-5 premium-card relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-3xl font-display font-extrabold text-slate-900">{dueTodayCount}</span>
              <p className="text-xs font-medium text-slate-500 mt-1">Deadline Today</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-4 border-t border-slate-100 pt-2 flex justify-between">
            <span>High Priority</span>
            <span className="font-semibold text-rose-600">{highPriorityCount} urgent</span>
          </div>
        </div>

        {/* Card 3: AI Suggestions */}
        <div className="p-5 premium-card relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-3xl font-display font-extrabold text-slate-900">{recommendationsCount}</span>
              <p className="text-xs font-medium text-slate-500 mt-1">AI Suggestions</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-4 border-t border-slate-100 pt-2 flex justify-between">
            <span>Smart Recommendations</span>
            <span className="font-semibold text-purple-600">{recommendationsCount} items</span>
          </div>
        </div>

        {/* Card 4: Completed Tasks */}
        <div className="p-5 premium-card relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-3xl font-display font-extrabold text-slate-900">{completedTasksCount}</span>
              <p className="text-xs font-medium text-slate-500 mt-1">Completed</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-4 border-t border-slate-100 pt-2 flex justify-between">
            <span>Success Rate</span>
            <span className="font-semibold text-emerald-600">
              {totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0}% Done
            </span>
          </div>
        </div>
      </div>

      {/* Main Structural Framework answering the 4 Core Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Column 1: Left - What do I need to do today? & What is most important? */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Question Section 1: What do I need to do today? (Today's Schedule / Calendar Timeline) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest font-mono">Question 1</span>
                <h3 className="font-display font-bold text-lg text-slate-900">What do I need to do today?</h3>
              </div>
              <button 
                onClick={() => onNavigate("planner")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Update Plan →
              </button>
            </div>

            {!dailyPlan || dailyPlan.length === 0 ? (
              <div className="p-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium">No plan generated for today yet.</p>
                <button 
                  onClick={() => onNavigate("planner")}
                  className="mt-3 text-xs bg-indigo-50 text-indigo-600 font-bold px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Create Plan Now
                </button>
              </div>
            ) : (
              <div className="space-y-4 relative pl-4 border-l border-slate-100">
                {dailyPlan.map((block, i) => {
                  let leftBorder = "border-slate-300";
                  let bgAccent = "bg-slate-50";
                  if (block.type === "deep_work") { leftBorder = "border-indigo-500"; bgAccent = "bg-indigo-50/40"; }
                  if (block.type === "break") { leftBorder = "border-emerald-500"; bgAccent = "bg-emerald-50/40"; }
                  if (block.type === "lunch") { leftBorder = "border-amber-500"; bgAccent = "bg-amber-50/40"; }
                  if (block.type === "buffer") { leftBorder = "border-rose-500"; bgAccent = "bg-rose-50/40"; }

                  return (
                    <div key={i} className="flex gap-4 items-start relative group">
                      <div className="w-16 text-right text-xs font-mono text-slate-400 shrink-0 pt-2.5">
                        {block.start_time}
                      </div>
                      <div className={`flex-1 p-4 rounded-xl border-l-4 ${leftBorder} ${bgAccent} border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2`}>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{block.title}</span>
                          <span className="text-[11px] text-slate-500 leading-relaxed mt-0.5 block">{block.description}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase text-slate-500 bg-white border border-slate-200/60 px-2 py-0.5 rounded-lg shrink-0">
                          {block.end_time} End
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Question Section 2: Am I at risk of missing anything? (Progress trends) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest font-mono">Question 2</span>
                <h3 className="font-display font-bold text-lg text-slate-900">Am I at risk of missing anything?</h3>
              </div>
              <button 
                onClick={handleForceRefreshAnalysis}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500"
                title="Refresh Metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider block">AI RISK FACTOR</span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">{riskPercent}%</span>
                  <span className={`text-xs font-semibold ${riskPercent > 50 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {riskPercent > 50 ? 'HIGH RISK' : 'LOW RISK'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${riskPercent > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${riskPercent}%` }} 
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider block">COMPLETION VELOCITY</span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">92%</span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +14.2%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: "92%" }} />
                </div>
              </div>
            </div>

            {/* Performance Trend Chart */}
            <div className="h-[220px] w-full pt-4">
              {!analytics ? (
                <div className="h-full w-full bg-slate-50 rounded-xl flex items-center justify-center animate-pulse">
                  <span className="text-slate-400 text-xs font-mono">Loading chart...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#ffffff", 
                        borderColor: "#e2e8f0",
                        borderRadius: "12px",
                        color: "#1e293b",
                        fontSize: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)"
                      }} 
                    />
                    <Line type="monotone" dataKey="Score" stroke="#4F46E5" strokeWidth={3} dot={{ r: 5, fill: "#4F46E5" }} activeDot={{ r: 7 }} />
                    <Line type="monotone" dataKey="Completed" stroke="#22C55E" strokeWidth={1.5} dot={{ r: 3, fill: "#22C55E" }} />
                    <Line type="monotone" dataKey="AtRisk" stroke="#EF4444" strokeWidth={1.5} dot={{ r: 3, fill: "#EF4444" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center space-x-6 text-[10px] font-mono text-slate-400 pt-4 border-t border-slate-100 mt-2">
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>PRODUCTIVITY (%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>COMPLETED</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>RISKY TASKS</span>
              </div>
            </div>
          </div>

        </div>

        {/* Column 2: Right - What is most important? & What should I do next? */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Question Section 3: What is most important? & What should I do next? (AI Suggestions list) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-left">
            <div className="mb-6">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest font-mono">Question 3 & 4</span>
              <h3 className="font-display font-bold text-lg text-slate-900">What's next & important?</h3>
            </div>

            {/* AI Suggestion Card style based on instruction rules */}
            <div className="space-y-4">
              
              {/* Main AI Recommendation Accordion */}
              {analysis?.recommendations?.length > 0 ? (
                analysis.recommendations.map((rec: any) => (
                  <div key={rec.id} className="p-4 rounded-xl border border-slate-200 bg-indigo-50/20 hover:border-indigo-300 transition-all">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">AI Suggestion</span>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{rec.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-normal">{rec.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 text-left">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Why?</span>
                      <ul className="space-y-1.5 text-[11px] text-slate-600">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Due soon / next buffer block</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Needs about {rec.why?.estimated_remaining_work ?? "2 hours"}</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Highest priority recommendation</span>
                        </li>
                      </ul>

                      <div className="mt-3 flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-mono">Completion Chance</span>
                        <span className="text-xs font-bold text-emerald-600">{rec.why?.confidence_score ?? 92}%</span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={() => handleRecAction(rec.action_type)}
                        className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all text-center"
                      >
                        Start Now
                      </button>
                      <button 
                        onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-semibold text-xs transition-all"
                      >
                        {expandedRec === rec.id ? "Hide" : "Details"}
                      </button>
                    </div>

                    {/* Detailed Diagnosis Sub-accordian */}
                    {expandedRec === rec.id && rec.why && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-2">
                        <p><strong>Diagnosis:</strong> {rec.why.workload_analysis}</p>
                        <p><strong>Importance:</strong> {rec.why.task_importance}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* Fallback clean placeholder matching user instructions perfectly */
                <div className="p-4 rounded-xl border border-slate-200 bg-indigo-50/20">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">AI Suggestion</span>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">Finish your Math Assignment first.</h4>
                      <p className="text-[11px] text-slate-500 leading-normal">This task is your highest priority and is due tomorrow morning.</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Why?</span>
                    <ul className="space-y-1.5 text-[11px] text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Due today</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Needs about 2 hours</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Highest priority</span>
                      </li>
                    </ul>

                    <div className="mt-3 flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Completion Chance</span>
                      <span className="text-xs font-bold text-emerald-600">92%</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => onNavigate("tasks")}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all text-center"
                    >
                      Start Now
                    </button>
                    <button 
                      onClick={() => onNavigate("planner")}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-semibold text-xs transition-all"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              )}

              {/* What-If Simulator Trigger button */}
              <button 
                onClick={handleTriggerSimulation}
                className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 text-xs font-semibold text-indigo-600 transition-all flex items-center justify-center space-x-1.5"
              >
                <Cpu className="w-4 h-4 animate-pulse" />
                <span>Simulate Day ("What-If")</span>
              </button>

            </div>
          </div>

          {/* Task Categories Split Pie Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-left">
            <h3 className="font-display font-bold text-sm text-slate-400 uppercase tracking-widest font-mono mb-4">Tasks by Category</h3>
            <div className="h-[140px] w-full flex items-center justify-center">
              {!analytics || analytics.categoryData.length === 0 ? (
                <span className="text-slate-400 text-xs font-mono uppercase">No categories yet</span>
              ) : (
                <>
                  <ResponsiveContainer width="45%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {analytics.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-1/2 space-y-1.5 pl-4 max-h-[140px] overflow-y-auto">
                    {analytics.categoryData.map((cat, i) => (
                      <div key={i} className="flex items-center space-x-2 text-[10px] font-mono text-left">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-slate-600 truncate max-w-[80px] uppercase font-semibold">{cat.name}</span>
                        <span className="text-slate-400">({cat.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* AI Activity Log / Chronological Trail */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-left">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">AI Activity Log</h3>
              <p className="text-xs text-slate-500">Recent autonomous schedule adjustments and priority ranking calculations</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-wider">
            Logs History
          </span>
        </div>

        {logsLoading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
            <p className="text-slate-400 text-xs">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
            You're all caught up! 🎉 Time to relax or plan something new.
          </div>
        ) : (
          <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6 max-h-[300px] overflow-y-auto pr-2">
            {logs.map((log) => {
              let parsedRes: any = {};
              try {
                parsedRes = JSON.parse(log.response || "{}");
              } catch {
                // Ignore
              }

              const explanation = parsedRes.reasoning || parsedRes.bottleneck_explanation || log.response;
              
              let actionBadge = "bg-slate-100 text-slate-600 border-slate-200";
              if (log.action.includes("Rescue")) actionBadge = "bg-rose-50 text-rose-600 border-rose-100";
              if (log.action.includes("Priorit")) actionBadge = "bg-indigo-50 text-indigo-600 border-indigo-100";
              if (log.action.includes("Analysis")) actionBadge = "bg-emerald-50 text-emerald-600 border-emerald-100";
              if (log.action.includes("Simulation")) actionBadge = "bg-purple-50 text-purple-600 border-purple-100";

              return (
                <div key={log.id} className="relative group">
                  <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white group-hover:bg-indigo-500 transition-all duration-300" />
                  
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all space-y-2">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase ${actionBadge}`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Log #{log.id}
                      </span>
                    </div>

                    <h4 className="font-semibold text-xs text-slate-800">{log.prompt}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100">
                      {explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* What-If Simulation Modal - redesigned to be clean, light, and modern */}
      <AnimatePresence>
        {showSimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center space-x-2 text-left">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-display font-bold text-lg text-slate-900">AI "What-If" Workspace Simulator</h3>
                </div>
                <button 
                  onClick={() => setShowSimModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Simulation Content */}
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {simulating ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Running full pathway simulation models...</p>
                  </div>
                ) : simulation ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    {/* Scenario A */}
                    <div className="p-6 rounded-2xl bg-indigo-50/40 border border-indigo-200 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 font-bold block">PATHWAY A</span>
                            <h4 className="font-display font-bold text-base text-slate-900">{simulation.scenario_a.title}</h4>
                          </div>
                          <span className="px-3 py-1 rounded-xl bg-indigo-100 border border-indigo-200 text-xs font-mono text-indigo-700 font-bold">
                            {simulation.scenario_a.completion_probability}% Success
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-3.5 rounded-xl border border-slate-200">
                          "{simulation.scenario_a.description}"
                        </p>

                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-indigo-700 font-bold block uppercase tracking-wider">KEY OUTCOMES</span>
                          <ul className="space-y-2">
                            {simulation.scenario_a.key_outcomes.map((o: string, idx: number) => (
                              <li key={idx} className="flex items-start text-xs text-slate-600">
                                <span className="text-indigo-600 mr-2">✔</span> {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-200 flex justify-between items-center mt-4">
                        <span className="text-[11px] font-mono text-slate-500">STRESS LEVEL: <span className="text-emerald-600 font-bold uppercase">{simulation.scenario_a.stress_level}</span></span>
                        <button 
                          onClick={() => {
                            setShowSimModal(false);
                            onNavigate("planner");
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/10"
                        >
                          Lock in AI Plan
                        </button>
                      </div>
                    </div>

                    {/* Scenario B */}
                    <div className="p-6 rounded-2xl bg-rose-50/40 border border-rose-200 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 font-bold block">PATHWAY B</span>
                            <h4 className="font-display font-bold text-base text-slate-900">{simulation.scenario_b.title}</h4>
                          </div>
                          <span className="px-3 py-1 rounded-xl bg-rose-100 border border-rose-200 text-xs font-mono text-rose-700 font-bold">
                            {simulation.scenario_b.completion_probability}% Success
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-3.5 rounded-xl border border-slate-200">
                          "{simulation.scenario_b.description}"
                        </p>

                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-rose-700 font-bold block uppercase tracking-wider">PROJECTED RISKS</span>
                          <ul className="space-y-2">
                            {simulation.scenario_b.key_outcomes.map((o: string, idx: number) => (
                              <li key={idx} className="flex items-start text-xs text-slate-600">
                                <span className="text-rose-600 mr-2">⚠️</span> {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-200 flex justify-between items-center mt-4">
                        <span className="text-[11px] font-mono text-slate-500">STRESS LEVEL: <span className="text-rose-600 font-bold uppercase">{simulation.scenario_b.stress_level}</span></span>
                        <span className="text-[10px] font-mono text-rose-600 font-bold italic">Conflict High</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-slate-500 text-sm">Failed to generate simulated pathways.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
