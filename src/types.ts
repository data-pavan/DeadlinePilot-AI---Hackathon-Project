export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: number; // 0 or 1
}

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  deadline: string;
  estimated_hours: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  status: "todo" | "in_progress" | "completed" | "archived";
  progress: number;
  notes: string;
  created_at: string;
  ai_urgency: number;
  ai_risk: number;
  ai_reasoning: string;
  ai_suggested_start: string;
  subtasks: Subtask[];
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "rescue";
  created_at: string;
  read: number; // 0 or 1
}

export interface ScheduleBlock {
  type: "deep_work" | "break" | "lunch" | "buffer";
  task_id?: number | null;
  title: string;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  description: string;
}

export interface RescueTimelineStep {
  phase: string;
  description: string;
}

export interface RescuePlan {
  is_overloaded: boolean;
  risk_level: "low" | "medium" | "high" | "critical";
  bottleneck_explanation: string;
  postponed_tasks_ids: number[];
  recovery_timeline: RescueTimelineStep[];
  action_checklist: string[];
  success_probability: number;
}

export interface AnalyticsHistoryPoint {
  id: number;
  date: string;
  productivity_score: number;
  completed_tasks: number;
  tasks_at_risk: number;
}

export interface AnalyticsSummary {
  history: AnalyticsHistoryPoint[];
  productivityScore: number;
  riskScore: number;
  completionRate: number;
  highRiskCount: number;
  overdueCount: number;
  categoryData: { name: string; value: number }[];
  recentDecisions: any[];
  totals: {
    all: number;
    active: number;
    completed: number;
    archived: number;
  };
}

export interface Settings {
  user_name?: string;
  work_hours_start?: string;
  work_hours_end?: string;
  productivity_goal?: string;
  rescue_mode_enabled?: string;
  auto_replan_enabled?: string;
  rescue_mode_active?: string;
  
  // Extended fields for custom settings
  work_start_time?: string;
  work_end_time?: string;
  peak_focus_period?: string;
  auto_rescue_enabled?: number;
  break_interval_minutes?: number;
  buffer_ratio_percent?: number;
  focus_streak_days?: number;
}

export interface ChatMessage {
  id: number;
  sender: "user" | "assistant";
  message: string;
  created_at: string;
}
