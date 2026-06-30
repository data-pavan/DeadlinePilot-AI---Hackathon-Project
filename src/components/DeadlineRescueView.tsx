import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ShieldAlert, 
  RefreshCw, 
  Sparkles, 
  CheckCircle, 
  TrendingUp, 
  Zap, 
  Flame, 
  HelpCircle,
  Play,
  Check,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { Task, RescuePlan } from "../types.ts";
import { api } from "../services/api.ts";

interface DeadlineRescueViewProps {
  tasks: Task[];
  onRefresh: () => void;
}

export default function DeadlineRescueView({
  tasks,
  onRefresh
}: DeadlineRescueViewProps) {
  const [loading, setLoading] = useState(true);
  const [rescueAssessment, setRescueAssessment] = useState<RescuePlan | null>(null);
  const [selectedPostponeIds, setSelectedPostponeIds] = useState<number[]>([]);
  const [executingRescue, setExecutingRescue] = useState(false);
  const [rescueSuccess, setRescueSuccess] = useState(false);

  // Load rescue assessment
  const fetchAssessment = async () => {
    setLoading(true);
    try {
      const data = await api.getRescueAssessment();
      setRescueAssessment(data);
      // Pre-select suggested postpone ids
      if (data.postponed_tasks_ids) {
        setSelectedPostponeIds(data.postponed_tasks_ids);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [tasks]);

  const handleTogglePostponeSelection = (id: number) => {
    if (selectedPostponeIds.includes(id)) {
      setSelectedPostponeIds(selectedPostponeIds.filter(x => x !== id));
    } else {
      setSelectedPostponeIds([...selectedPostponeIds, id]);
    }
  };

  const handleExecuteRescueOperation = async () => {
    setExecutingRescue(true);
    try {
      const success = await api.executeRescue(selectedPostponeIds);
      if (success) {
        setRescueSuccess(true);
        onRefresh();
        // Clear success modal/banner after delay
        setTimeout(() => {
          setRescueSuccess(false);
          fetchAssessment();
        }, 6000);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to execute rescue. Verify database connectivity.");
    } finally {
      setExecutingRescue(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Generating reports and active insights...</p>
        </div>
      </div>
    );
  }

  if (!rescueAssessment) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Unable to reach the database server. Please try again.
      </div>
    );
  }

  // Get task objects that match the suggested postpone list
  const postponedTaskCandidates = tasks.filter(t => 
    t.status !== "completed" && 
    t.status !== "archived" &&
    (t.priority === "low" || t.priority === "medium")
  ).slice(0, 4); // show some candidates to postpone

  // Colors based on risk level
  let dangerColorClasses = "text-emerald-600 bg-emerald-50 border-emerald-100";
  let pulseBorder = "";
  if (rescueAssessment.risk_level === "high" || rescueAssessment.risk_level === "critical") {
    dangerColorClasses = "text-rose-600 bg-rose-50 border-rose-200";
    pulseBorder = "border-rose-300 ring-1 ring-rose-500/10";
  } else if (rescueAssessment.risk_level === "medium") {
    dangerColorClasses = "text-amber-600 bg-amber-50 border-amber-200";
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 text-left"
    >
      {/* Header Info */}
      <div>
        <h2 className="font-display font-bold text-xl text-slate-800 flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-indigo-600" />
          <span>Reports & Insights</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Smart collision checking, workload diagnostics, and automated schedule stress resolution.
        </p>
      </div>

      {rescueSuccess ? (
        /* Success splash feedback */
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 text-center rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="font-display font-bold text-xl text-slate-800">Schedule Successfully Resolved!</h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            DeadlinePilot has moved {selectedPostponeIds.length} low-priority tasks to later days so you can focus on your most important work. Check your Daily Plan to see the updated schedule!
          </p>
          <div className="text-xs font-mono font-bold text-emerald-600">STATUS: SCHEDULE RESOLVED ✔</div>
        </motion.div>
      ) : (
        /* Normal diagnostic cockpit */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Diagnostic status columns */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Risk Dashboard */}
            <div className={`p-6 rounded-2xl bg-white border ${pulseBorder || 'border-slate-200'} grid grid-cols-1 sm:grid-cols-2 gap-6 relative overflow-hidden shadow-sm`}>
              {/* Left stat column */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREDICTIVE COLLISION RISK</span>
                  <span className={`text-2xl font-display font-extrabold uppercase tracking-wide block ${
                    rescueAssessment.risk_level === "critical" || rescueAssessment.risk_level === "high" ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {rescueAssessment.risk_level} Risk Level
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RECOVERY SUCCESS CHANCE</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-display font-extrabold text-slate-800">{rescueAssessment.success_probability}%</span>
                    <span className="text-xs text-indigo-600 font-semibold">with rescue plan</span>
                  </div>
                </div>
              </div>

              {/* Right explanation column */}
              <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI DIAGNOSIS</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{rescueAssessment.bottleneck_explanation}"
                  </p>
                </div>
              </div>
            </div>

            {/* AI Generated Recovery Checklist and Timeline */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-5 shadow-sm">
              <h3 className="font-display font-bold text-base text-slate-800 flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <span>AI Generated Milestones & Recovery</span>
              </h3>

              {/* Timeline Steps */}
              <div className="relative pl-6 space-y-4 border-l border-slate-100">
                {rescueAssessment.recovery_timeline.map((step, i) => (
                  <div key={i} className="relative group text-left">
                    <div className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <h4 className="text-xs font-semibold text-slate-800">{step.phase}</h4>
                    <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                  </div>
                ))}
              </div>

              {/* Action Checklist */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recommended Action Items</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rescueAssessment.action_checklist.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-600 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Postpone selection controls side panel */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                <h3 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider">Postpone Tasks</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Postpone lower-priority tasks to give yourself more buffer room for critical deadlines.
              </p>

              {postponedTaskCandidates.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs border border-slate-200 border-dashed rounded-xl">
                  No adjustable tasks found to postpone.
                </div>
              ) : (
                <div className="space-y-2">
                  {postponedTaskCandidates.map((task) => {
                    const selected = selectedPostponeIds.includes(task.id);
                    return (
                      <div 
                        key={task.id}
                        onClick={() => handleTogglePostponeSelection(task.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                          selected 
                            ? "bg-rose-50 border-rose-300 text-slate-800" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <div className="space-y-1 text-left">
                          <span className="text-xs font-semibold block">{task.title}</span>
                          <span className="text-[9px] font-semibold text-slate-400 block">EST: {task.estimated_hours}h</span>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          selected ? 'bg-rose-600 border-rose-600' : 'border-slate-300'
                        }`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Master Execute Button */}
              <button
                onClick={handleExecuteRescueOperation}
                disabled={executingRescue || selectedPostponeIds.length === 0}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50 mt-4 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {executingRescue ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-300" />
                )}
                <span>{executingRescue ? "Adjusting schedule..." : "Fix My Schedule"}</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </motion.div>
  );
}
