import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Archive, 
  CheckSquare, 
  Square, 
  Compass, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Edit, 
  Calendar, 
  Clock, 
  AlertCircle,
  BrainCircuit,
  Search,
  Check,
  RefreshCw,
  Play
} from "lucide-react";
import { Task, Subtask } from "../types.ts";
import { api } from "../services/api.ts";

interface TaskControlCenterProps {
  tasks: Task[];
  onRefresh: () => void;
  onUpdateTask: (id: number, data: Partial<Task>) => void;
  onDeleteTask: (id: number) => void;
  onArchiveTask: (id: number) => void;
  onDuplicateTask: (id: number) => void;
  onToggleSubtask: (id: number, subtaskId: number, completed: boolean) => void;
}

export default function TaskControlCenter({
  tasks,
  onRefresh,
  onUpdateTask,
  onDeleteTask,
  onArchiveTask,
  onDuplicateTask,
  onToggleSubtask
}: TaskControlCenterProps) {
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  // Form states for creating task
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [deadline, setDeadline] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("2");
  const [category, setCategory] = useState("work");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [notes, setNotes] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  // Edit Task States
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editDeadline, setEditDeadline] = useState("");
  const [editEstimatedHours, setEditEstimatedHours] = useState("2");
  const [editCategory, setEditCategory] = useState("work");
  const [editDifficulty, setEditDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [editNotes, setEditNotes] = useState("");

  const startEditing = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    // Format deadline local string: YYYY-MM-DDThh:mm
    const date = new Date(task.deadline);
    const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    setEditDeadline(localISOTime);
    setEditEstimatedHours(task.estimated_hours.toString());
    setEditCategory(task.category || "work");
    setEditDifficulty(task.difficulty || "medium");
    setEditNotes(task.notes || "");
  };

  const handleUpdateTaskDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await api.updateTask(editingTask.id, {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        deadline: new Date(editDeadline).toISOString(),
        estimated_hours: parseFloat(editEstimatedHours) || 1,
        category: editCategory,
        difficulty: editDifficulty,
        notes: editNotes
      });
      setEditingTask(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to update task details");
    }
  };

  // Trigger AI decomposition to generate subtasks
  const handleAIBreakdown = async () => {
    if (!title) {
      alert("Please provide a task title/goal first to allow AI breakdown.");
      return;
    }
    setIsAILoading(true);
    try {
      const suggestedSubtasks = await api.getTaskBreakdown(title, description);
      setSubtasks(suggestedSubtasks);
    } catch (e) {
      console.error(e);
      alert("AI subtask decomposition failed. Verify API configuration.");
    } finally {
      setIsAILoading(false);
    }
  };

  const handleAddSubtaskItem = () => {
    if (newSubtaskText.trim()) {
      setSubtasks([...subtasks, newSubtaskText.trim()]);
      setNewSubtaskText("");
    }
  };

  const handleRemoveSubtaskItem = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) {
      alert("Title and Deadline are required!");
      return;
    }

    try {
      await api.createTask({
        title,
        description,
        priority,
        deadline: new Date(deadline).toISOString(),
        estimated_hours: parseFloat(estimatedHours) || 1,
        category,
        difficulty,
        notes,
        subtasks
      });
      
      // Reset
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDeadline("");
      setEstimatedHours("2");
      setCategory("work");
      setDifficulty("medium");
      setNotes("");
      setSubtasks([]);
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to create task");
    }
  };

  const handleUpdateTaskStatus = (task: Task, newStatus: "todo" | "in_progress" | "completed") => {
    onUpdateTask(task.id, { status: newStatus });
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (task.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "active") {
      return matchesSearch && task.status !== "completed" && task.status !== "archived";
    } else if (activeTab === "completed") {
      return matchesSearch && task.status === "completed";
    } else {
      return matchesSearch && task.status === "archived";
    }
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 text-left"
    >
      {/* Top bar with filters and Launch Add Task */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Tab Filters */}
        <div className="flex space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "active" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Today's Pipeline
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "completed" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "archived" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Archive
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex w-full sm:w-auto items-center space-x-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-all shadow-sm flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Main Task Cards Container */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="p-16 text-center border border-slate-200 border-dashed rounded-3xl bg-white shadow-sm">
            <Compass className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-sm text-slate-500 mb-1">No tasks found</h3>
            <p className="text-xs text-slate-400">Click the add button above to write down what you need to do.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const hasRisk = task.ai_risk > 0.5;
              
              let priorityColor = "bg-slate-50 text-slate-500 border-slate-200";
              if (task.priority === "high") priorityColor = "bg-rose-50 text-rose-600 border-rose-100";
              if (task.priority === "medium") priorityColor = "bg-amber-50 text-amber-600 border-amber-100";

              const subtasksCompleted = task.subtasks.filter(s => s.completed).length;
              const subtasksTotal = task.subtasks.length;
              const subtaskPercent = subtasksTotal > 0 ? Math.round((subtasksCompleted / subtasksTotal) * 100) : 0;

              return (
                <div 
                  key={task.id}
                  className={`rounded-2xl bg-white border transition-all shadow-sm ${
                    isExpanded ? "border-indigo-300" : "border-slate-200 hover:border-slate-300"
                  } ${hasRisk && task.status !== "completed" ? "border-rose-200 bg-rose-50/10" : ""}`}
                >
                  {/* Task Summary Line Row */}
                  <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Checkbox trigger for quick complete */}
                      {task.status === "completed" ? (
                        <CheckSquare 
                          className="w-5 h-5 text-emerald-500 mt-0.5 cursor-pointer flex-shrink-0" 
                          onClick={() => handleUpdateTaskStatus(task, "todo")}
                        />
                      ) : (
                        <Square 
                          className="w-5 h-5 text-slate-300 mt-0.5 cursor-pointer hover:text-indigo-600 flex-shrink-0" 
                          onClick={() => handleUpdateTaskStatus(task, "completed")}
                        />
                      )}

                      <div className="space-y-1 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-semibold transition-colors ${
                            task.status === "completed" ? "text-slate-400 line-through font-normal" : "text-slate-800"
                          }`}>
                            {task.title}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${priorityColor}`}>
                            {task.priority}
                          </span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 uppercase font-semibold">
                            {task.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">{task.description || "No description provided."}</p>
                      </div>
                    </div>

                    {/* Meta Indicators and Actions */}
                    <div className="flex items-center space-x-4 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{task.estimated_hours}h</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{new Date(task.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Control buttons */}
                      <div className="flex items-center space-x-2">
                        {/* Expand Button */}
                        <button
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        
                        {/* Duplicate */}
                        <button
                          onClick={() => onDuplicateTask(task.id)}
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                          title="Duplicate task"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Archive */}
                        {task.status !== "archived" && (
                          <button
                            onClick={() => onArchiveTask(task.id)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-amber-300 text-slate-500 hover:text-amber-600 transition-all cursor-pointer"
                            title="Archive task"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded AI Insights & Subtasks Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-200 overflow-hidden"
                      >
                        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50/50 text-left">
                          {/* Left Columns: Task Description, Notes and Checklist */}
                          <div className="lg:col-span-2 space-y-5">
                            {task.notes && (
                              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
                                <span className="font-bold text-slate-800 block mb-1">Notes:</span>
                                {task.notes}
                              </div>
                            )}

                            {/* Checklist horizontal progress */}
                            {subtasksTotal > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold text-slate-600">
                                  <span>Subtasks Checklist Progress</span>
                                  <span>{subtaskPercent}% ({subtasksCompleted}/{subtasksTotal})</span>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${subtaskPercent}%` }} 
                                  />
                                </div>
                              </div>
                            )}

                            {/* Subtask Checklist */}
                            <div className="space-y-3">
                              <h4 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider">Subtask Objectives</h4>
                              {task.subtasks.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No checklist items defined for this task.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {task.subtasks.map((sub) => (
                                    <div 
                                      key={sub.id} 
                                      onClick={() => onToggleSubtask(task.id, sub.id, !sub.completed)}
                                      className={`p-2.5 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                                        sub.completed 
                                          ? "bg-emerald-50/50 border-emerald-200 text-slate-500" 
                                          : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                                      }`}
                                    >
                                      {sub.completed ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                      )}
                                      <span className="text-[11px] line-clamp-1">{sub.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Primary control actions: Start, Edit, Complete */}
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              {task.status === "todo" && (
                                <button 
                                  onClick={() => handleUpdateTaskStatus(task, "in_progress")}
                                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5" /> Start Work
                                </button>
                              )}
                              {task.status !== "completed" && (
                                <button 
                                  onClick={() => handleUpdateTaskStatus(task, "completed")}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" /> Complete Task
                                </button>
                              )}
                              <button 
                                onClick={() => startEditing(task)}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" /> Edit Details
                              </button>
                            </div>
                          </div>

                          {/* Right Column: AI Autopilot Decision Insights */}
                          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-3 relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center space-x-1.5 text-indigo-700 text-xs font-bold font-mono">
                                <BrainCircuit className="w-4 h-4" />
                                <span>AI INSIGHTS</span>
                              </div>

                              {/* Scoring */}
                              <div className="grid grid-cols-2 gap-3 text-center border-b border-indigo-100 pb-3">
                                <div className="p-2 bg-white rounded-lg border border-slate-100">
                                  <span className="text-[9px] font-mono text-slate-400 uppercase">AI Urgency</span>
                                  <span className="text-sm font-bold text-indigo-600 block">{task.ai_urgency || "N/A"}/10</span>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-100">
                                  <span className="text-[9px] font-mono text-slate-400 uppercase">Failure Risk</span>
                                  <span className={`text-sm font-bold block ${task.ai_risk > 0.6 ? 'text-rose-600 font-extrabold' : 'text-emerald-600'}`}>
                                    {task.ai_risk !== undefined ? `${Math.round(task.ai_risk * 100)}%` : "0%"}
                                  </span>
                                </div>
                              </div>

                              {/* Recommended Start */}
                              <div className="text-xs">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">AI SUGGESTED START</span>
                                <span className="text-slate-700 font-semibold">
                                  {task.ai_suggested_start ? new Date(task.ai_suggested_start).toLocaleString() : "Start immediately"}
                                </span>
                              </div>
                            </div>

                            {/* Reasoning Text */}
                            <div className="text-[11px] text-slate-600 leading-relaxed italic border-t border-indigo-100 pt-3">
                              💡 AI Tip: "{task.ai_reasoning || "Focus on completing the core requirements early to establish a buffer."}"
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Task Modal with Autonomous AI Breakdown Button */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-left"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2">
                <BrainCircuit className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-lg text-slate-800">Create New Task</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Row 1: Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finish math assignment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              {/* Row 2: Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="What is this task about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              {/* Config Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Complexity</label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="work">Work / Study</option>
                    <option value="personal">Personal / Leisure</option>
                    <option value="study">Research / Learn</option>
                    <option value="finance">Finance / Admin</option>
                    <option value="health">Health / Fitness</option>
                  </select>
                </div>
              </div>

              {/* Deadline & Estimates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Hours</label>
                  <input
                    type="number"
                    required
                    min={0.5}
                    max={100}
                    step={0.5}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                </div>
              </div>

              {/* Dynamic Subtask Builder and AI Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Subtasks checklist</span>
                  <button
                    type="button"
                    onClick={handleAIBreakdown}
                    disabled={isAILoading}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold text-[10px] text-white flex items-center space-x-1 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isAILoading ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-300" />
                    )}
                    <span>Generate Subtasks with AI</span>
                  </button>
                </div>

                {/* Subtasks Item List */}
                {subtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                    {subtasks.map((st, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded bg-white border border-slate-200 text-[11px]">
                        <span className="text-slate-700 line-clamp-1">{st}</span>
                        <button type="button" onClick={() => handleRemoveSubtaskItem(idx)} className="text-rose-500 hover:text-rose-700">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual Item Add Row */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add manual checklist item..."
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtaskItem())}
                    className="flex-1 p-2 rounded-xl border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtaskItem}
                    className="px-3 py-2 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 text-[11px] font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Optional Admin Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Additional Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Any special details for the task..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none"
                />
              </div>

              {/* Footer CTA */}
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white shadow-sm cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-left"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-lg text-slate-800">Edit Task Details</h3>
              </div>
              <button onClick={() => setEditingTask(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTaskDetails} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e: any) => setEditPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Complexity</label>
                  <select
                    value={editDifficulty}
                    onChange={(e: any) => setEditDifficulty(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e: any) => setEditCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="work">Work / Study</option>
                    <option value="personal">Personal / Leisure</option>
                    <option value="study">Research / Learn</option>
                    <option value="finance">Finance / Admin</option>
                    <option value="health">Health / Fitness</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Hours</label>
                  <input
                    type="number"
                    required
                    min={0.5}
                    max={100}
                    step={0.5}
                    value={editEstimatedHours}
                    onChange={(e) => setEditEstimatedHours(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Additional Notes (Optional)</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
