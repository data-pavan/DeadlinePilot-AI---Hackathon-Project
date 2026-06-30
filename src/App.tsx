import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Compass, 
  FolderKanban, 
  Calendar, 
  ShieldAlert, 
  Grid, 
  Sparkles, 
  Clock, 
  Sliders, 
  MessageSquare,
  Bell, 
  RefreshCw,
  LogOut,
  ChevronDown,
  User,
  Activity,
  Check,
  AlertTriangle,
  X,
  ArrowRight
} from "lucide-react";

import { Task, ScheduleBlock, Notification, AnalyticsSummary, Settings } from "./types.ts";
import { api } from "./services/api.ts";

// Subviews
import LandingPage from "./components/LandingPage.tsx";
import DashboardView from "./components/DashboardView.tsx";
import TaskControlCenter from "./components/TaskControlCenter.tsx";
import DailyPlannerView from "./components/DailyPlannerView.tsx";
import DeadlineRescueView from "./components/DeadlineRescueView.tsx";
import CalendarPanel from "./components/CalendarPanel.tsx";
import FocusModeView from "./components/FocusModeView.tsx";
import ChatAssistantView from "./components/ChatAssistantView.tsx";
import SettingsView from "./components/SettingsView.tsx";
import AuthView from "./components/AuthView.tsx";

export default function App() {
  const [currentView, setCurrentView] = useState<string>("landing");
  
  // User Authentication State
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string } | null>(() => {
    try {
      const cached = localStorage.getItem("dp_current_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // App States
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const cached = localStorage.getItem("dp_tasks");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [dailyPlan, setDailyPlan] = useState<ScheduleBlock[]>(() => {
    try {
      const cached = localStorage.getItem("dp_dailyPlan");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const cached = localStorage.getItem("dp_notifications");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(() => {
    try {
      const cached = localStorage.getItem("dp_analytics");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [settings, setSettings] = useState<Settings | null>(() => {
    try {
      const cached = localStorage.getItem("dp_settings");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  
  // Real-time Flight Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all database metrics
  const refreshAllData = async () => {
    if (currentView === "landing" || !currentUser) return;
    setLoading(true);
    try {
      const [allTasks, plan, alerts, summary, pref] = await Promise.all([
        api.getTasks(),
        api.getDailyPlan(),
        api.getNotifications(),
        api.getAnalytics(),
        api.getSettings()
      ]);
      setTasks(allTasks);
      setDailyPlan(plan);
      setNotifications(alerts);
      setAnalytics(summary);
      setSettings(pref);

      try {
        localStorage.setItem("dp_tasks", JSON.stringify(allTasks));
        localStorage.setItem("dp_dailyPlan", JSON.stringify(plan));
        localStorage.setItem("dp_notifications", JSON.stringify(alerts));
        localStorage.setItem("dp_analytics", JSON.stringify(summary));
        localStorage.setItem("dp_settings", JSON.stringify(pref));
      } catch (err) {
        console.error("Local storage caching failed:", err);
      }
    } catch (e) {
      console.error("Data fetch failure:", e);
    } finally {
      setLoading(false);
    }
  };

  // Sync data when view shifts or when user changes
  useEffect(() => {
    refreshAllData();
  }, [currentView, currentUser]);

  // Operations
  const handleUpdateTask = async (id: number, data: Partial<Task>) => {
    try {
      await api.updateTask(id, data);
      await refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await api.deleteTask(id);
      await refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchiveTask = async (id: number) => {
    try {
      await api.archiveTask(id);
      await refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicateTask = async (id: number) => {
    try {
      await api.duplicateTask(id);
      await refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSubtask = async (id: number, subtaskId: number, completed: boolean) => {
    try {
      await api.toggleSubtask(id, subtaskId, completed);
      await refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegeneratePlan = async () => {
    try {
      const newPlan = await api.regenerateDailyPlan();
      setDailyPlan(newPlan);
      await refreshAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async (newSettings: Settings) => {
    try {
      const ok = await api.saveSettings(newSettings);
      if (ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleTriggerPrioritizeAll = async () => {
    try {
      await api.prioritizeAll();
      await refreshAllData();
      alert("Autopilot prioritization update complete. Check Task Urgency rankings.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkNotificationsRead = async (id?: number) => {
    try {
      await api.markNotificationsRead(id);
      const alerts = await api.getNotifications();
      setNotifications(alerts);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await api.deleteNotification(id);
      const alerts = await api.getNotifications();
      setNotifications(alerts);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setTasks([]);
    setDailyPlan([]);
    setNotifications([]);
    setAnalytics(null);
    setSettings(null);
    setCurrentView("landing");
  };

  const unreadAlertsCount = notifications.filter(n => !n.read).length;

  // ROUTE CONTROL & BYPASS FOR AUTH
  if (!currentUser) {
    if (currentView === "landing") {
      return <LandingPage onLaunch={() => setCurrentView("dashboard")} />;
    }
    return <AuthView onAuthSuccess={(user) => {
      setCurrentUser(user);
      setCurrentView("dashboard");
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans antialiased overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 hidden md:flex flex-shrink-0 shadow-sm">
        <div className="space-y-6">
          {/* Brand/Logo header */}
          <div className="p-6 flex items-center space-x-2.5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-slate-900 tracking-tight text-sm block">DeadlinePilot AI</span>
              <span className="text-[10px] font-semibold text-indigo-600 block tracking-wider uppercase">Productivity Pilot</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: <Grid className="w-4 h-4" /> },
              { id: "tasks", label: "My Tasks", icon: <FolderKanban className="w-4 h-4" /> },
              { id: "planner", label: "Today's Plan", icon: <Calendar className="w-4 h-4" /> },
              { id: "calendar", label: "Calendar", icon: <Clock className="w-4 h-4" /> },
              { id: "chat", label: "AI Assistant", icon: <MessageSquare className="w-4 h-4" /> },
              { id: "focus", label: "Focus Mode", icon: <Activity className="w-4 h-4 text-amber-500" /> },
              { id: "rescue", label: "Reports", icon: <ShieldAlert className="w-4 h-4 text-indigo-500" />, badge: analytics?.riskScore && analytics.riskScore > 50 ? "URGENT" : undefined },
              { id: "settings", label: "Settings", icon: <Sliders className="w-4 h-4" /> }
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => setCurrentView(link.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold uppercase transition-all ${
                  currentView === link.id 
                    ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50" 
                    : "text-slate-500 hover:text-slate-800 border border-transparent hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[8px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                    {link.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer info logout */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50">
          <div className="flex items-center space-x-3 p-1.5 rounded-xl bg-white border border-slate-200">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate w-full">
              <span className="text-[10px] font-bold text-slate-700 block capitalize truncate">{currentUser.username}</span>
              <span className="text-[9px] text-slate-500 block truncate">{currentUser.username}@deadlinepilot.ai</span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full py-2 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 text-slate-500 text-[10px] font-bold uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen max-w-full">
        
        {/* Upper Header status bar */}
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-40">
          
          {/* Left Title details */}
          <div className="flex items-center space-x-3">
            {/* Mobile Sidebar Navigation button */}
            <div className="md:hidden flex space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {["Home", "Tasks", "Reports", "Chat"].map((v) => {
                const mapId: Record<string, string> = { Home: "dashboard", Tasks: "tasks", Reports: "rescue", Chat: "chat" };
                const viewId = mapId[v];
                return (
                  <button
                    key={v}
                    onClick={() => setCurrentView(viewId)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      currentView === viewId ? "bg-indigo-600 text-white" : "text-slate-500"
                    }`}
                  >
                    {v.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex items-center space-x-2.5 text-xs text-slate-500">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">Current Time:</span>
              <span className="text-slate-700 font-bold bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg font-mono">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-4">
            
            {/* User Profile display on mobile */}
            <div className="md:hidden flex items-center space-x-1 bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1 rounded-xl text-[10px] font-bold capitalize">
              <User className="w-3 h-3" />
              <span>{currentUser.username}</span>
            </div>

            {/* Sync trigger */}
            <button 
              onClick={refreshAllData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors relative cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Notifications Dropdown Container */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
                )}
              </button>

              <AnimatePresence>
                {showNotificationsDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden z-50 text-left"
                  >
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notifications</span>
                      {unreadAlertsCount > 0 && (
                        <button 
                          onClick={() => handleMarkNotificationsRead()}
                          className="text-[10px] text-indigo-600 hover:text-indigo-500 font-semibold cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs uppercase">
                          No notifications.
                        </div>
                      ) : (
                        notifications.map((alert) => (
                          <div 
                            key={alert.id} 
                            className={`p-3.5 transition-colors relative flex justify-between items-start gap-2 ${
                              alert.read ? 'bg-white text-slate-400' : 'bg-indigo-50/30 text-slate-800'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1.5">
                                {!alert.read && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                <span className={`text-xs font-semibold ${alert.read ? 'text-slate-400' : 'text-slate-800'}`}>
                                  {alert.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">{alert.message}</p>
                              <span className="text-[9px] text-slate-400 block">{new Date(alert.created_at).toLocaleTimeString()}</span>
                            </div>
                            <button 
                              onClick={() => handleDeleteNotification(alert.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* AI Status badge */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Compass className="w-4 h-4" />
              </div>
              <div className="pr-2 text-right">
                <span className="text-[10px] font-bold text-slate-700 block">AI ASSISTANT</span>
                <span className="text-[8px] font-bold text-emerald-600 block uppercase">ACTIVE</span>
              </div>
            </div>

            {/* Logout Shortcut Header Icon */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </header>

        {/* Dynamic Inner Panel viewport */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {currentView === "dashboard" && (
              <DashboardView 
                key="dashboard"
                tasks={tasks}
                analytics={analytics}
                dailyPlan={dailyPlan}
                settings={settings}
                onNavigate={setCurrentView}
                onRefresh={refreshAllData}
                onTriggerPrioritizeAll={handleTriggerPrioritizeAll}
              />
            )}
            {currentView === "tasks" && (
              <TaskControlCenter 
                key="tasks"
                tasks={tasks}
                onRefresh={refreshAllData}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onArchiveTask={handleArchiveTask}
                onDuplicateTask={handleDuplicateTask}
                onToggleSubtask={handleToggleSubtask}
              />
            )}
            {currentView === "planner" && (
              <DailyPlannerView 
                key="planner"
                dailyPlan={dailyPlan}
                settings={settings}
                onRegeneratePlan={handleRegeneratePlan}
              />
            )}
            {currentView === "rescue" && (
              <DeadlineRescueView 
                key="rescue"
                tasks={tasks}
                onRefresh={refreshAllData}
              />
            )}
            {currentView === "calendar" && (
              <CalendarPanel 
                key="calendar"
                tasks={tasks}
                dailyPlan={dailyPlan}
              />
            )}
            {currentView === "focus" && (
              <FocusModeView 
                key="focus"
                tasks={tasks}
                onNavigate={setCurrentView}
                onUpdateTask={handleUpdateTask}
              />
            )}
            {currentView === "chat" && (
              <ChatAssistantView 
                key="chat"
                tasks={tasks}
                settings={settings}
                onRefresh={refreshAllData}
              />
            )}
            {currentView === "settings" && (
              <SettingsView 
                key="settings"
                settings={settings}
                onRefresh={refreshAllData}
                onSaveSettings={handleSaveSettings}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

    </div>
  );
}
