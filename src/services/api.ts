import { 
  Task, 
  Notification, 
  ScheduleBlock, 
  RescuePlan, 
  AnalyticsSummary, 
  Settings, 
  ChatMessage 
} from "../types.ts";

const API_BASE = ""; // Relative paths route to the custom server automatically

// Helper to inject the current user ID into HTTP request headers
function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  try {
    const userJson = localStorage.getItem("dp_current_user");
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user && user.id) {
        headers["X-User-Id"] = String(user.id);
      }
    }
  } catch (e) {
    console.error("Failed to read user from localStorage", e);
  }
  return headers;
}

async function customFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401 && !url.includes("/api/auth/login") && !url.includes("/api/auth/register")) {
    localStorage.removeItem("dp_current_user");
    localStorage.removeItem("dp_tasks");
    localStorage.removeItem("dp_dailyPlan");
    localStorage.removeItem("dp_notifications");
    localStorage.removeItem("dp_analytics");
    localStorage.removeItem("dp_settings");
    window.location.reload();
  }
  return res;
}

export const api = {
  // AUTH
  async login(username: string, password: string): Promise<{ id: number; username: string }> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Invalid username or password." }));
      throw new Error(err.error || "Invalid username or password.");
    }
    const user = await res.json();
    localStorage.setItem("dp_current_user", JSON.stringify(user));
    return user;
  },

  async register(username: string, password: string): Promise<{ id: number; username: string }> {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Username already exists." }));
      throw new Error(err.error || "Registration failed.");
    }
    const user = await res.json();
    localStorage.setItem("dp_current_user", JSON.stringify(user));
    return user;
  },

  async logout(): Promise<void> {
    localStorage.removeItem("dp_current_user");
    // Clear all other cached user data from memory and local storage
    localStorage.removeItem("dp_tasks");
    localStorage.removeItem("dp_dailyPlan");
    localStorage.removeItem("dp_notifications");
    localStorage.removeItem("dp_analytics");
    localStorage.removeItem("dp_settings");
  },

  async getMe(): Promise<{ id: number; username: string } | null> {
    const res = await customFetch(`${API_BASE}/api/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return res.json();
  },

  // TASKS
  async getTasks(): Promise<Task[]> {
    const res = await customFetch(`${API_BASE}/api/tasks`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
  },

  async createTask(taskData: {
    title: string;
    description?: string;
    priority?: string;
    deadline: string;
    estimated_hours?: number;
    category?: string;
    difficulty?: string;
    notes?: string;
    subtasks?: string[];
  }): Promise<Task> {
    const res = await customFetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(taskData)
    });
    if (!res.ok) throw new Error("Failed to create task");
    return res.json();
  },

  async updateTask(id: number, taskData: Partial<Task>): Promise<Task> {
    const res = await customFetch(`${API_BASE}/api/tasks/${id}`, {
      method: "PUT",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(taskData)
    });
    if (!res.ok) throw new Error("Failed to update task");
    return res.json();
  },

  async toggleSubtask(id: number, subtaskId: number, completed: boolean): Promise<Task> {
    const res = await customFetch(`${API_BASE}/api/tasks/${id}/toggle-subtask`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ subtaskId, completed })
    });
    if (!res.ok) throw new Error("Failed to toggle subtask");
    return res.json();
  },

  async deleteTask(id: number): Promise<boolean> {
    const res = await customFetch(`${API_BASE}/api/tasks/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to delete task");
    const data = await res.json();
    return data.success;
  },

  async archiveTask(id: number): Promise<boolean> {
    const res = await customFetch(`${API_BASE}/api/tasks/${id}/archive`, {
      method: "POST",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to archive task");
    const data = await res.json();
    return data.success;
  },

  async duplicateTask(id: number): Promise<Task> {
    const res = await customFetch(`${API_BASE}/api/tasks/${id}/duplicate`, {
      method: "POST",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to duplicate task");
    return res.json();
  },

  async prioritizeAll(): Promise<boolean> {
    const res = await customFetch(`${API_BASE}/api/ai/prioritize-all`, {
      method: "POST",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to prioritize active tasks");
    const data = await res.json();
    return data.success;
  },

  // DAILY PLAN
  async getDailyPlan(): Promise<ScheduleBlock[]> {
    const res = await customFetch(`${API_BASE}/api/ai/plan`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch daily plan");
    return res.json();
  },

  async regenerateDailyPlan(): Promise<ScheduleBlock[]> {
    const res = await customFetch(`${API_BASE}/api/ai/plan/generate`, {
      method: "POST",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to generate daily plan");
    return res.json();
  },

  // RESCUE MODE
  async getRescueAssessment(): Promise<RescuePlan> {
    const res = await customFetch(`${API_BASE}/api/ai/rescue`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch rescue assessment");
    return res.json();
  },

  async executeRescue(postponed_tasks_ids: number[]): Promise<boolean> {
    const res = await customFetch(`${API_BASE}/api/ai/rescue/execute`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ postponed_tasks_ids })
    });
    if (!res.ok) throw new Error("Failed to execute rescue plan");
    const data = await res.json();
    return data.success;
  },

  // TASK BREAKDOWN
  async getTaskBreakdown(title: string, description?: string): Promise<string[]> {
    const res = await customFetch(`${API_BASE}/api/ai/breakdown`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ title, description })
    });
    if (!res.ok) throw new Error("Failed to generate subtasks");
    return res.json();
  },

  // PRODUCTIVITY COACH
  async getCoachAnswer(question: string): Promise<string> {
    const res = await customFetch(`${API_BASE}/api/ai/coach`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ question })
    });
    if (!res.ok) throw new Error("Failed to fetch coach insight");
    const data = await res.json();
    return data.answer;
  },

  // CHAT ASSISTANT
  async getChatLogs(): Promise<ChatMessage[]> {
    const res = await customFetch(`${API_BASE}/api/ai/chat`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch chat logs");
    return res.json();
  },

  async sendChatMessage(message: string): Promise<string> {
    const res = await customFetch(`${API_BASE}/api/ai/chat`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message })
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      try {
        const errJson = JSON.parse(errorText);
        throw new Error(errJson.error || "Failed to send chat message");
      } catch {
        throw new Error(errorText || "Failed to send chat message");
      }
    }
    const data = await res.json();
    return data.response;
  },

  // NOTIFICATIONS
  async getNotifications(): Promise<Notification[]> {
    const res = await customFetch(`${API_BASE}/api/notifications`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
  },

  async markNotificationsRead(id?: number): Promise<boolean> {
    const res = await customFetch(`${API_BASE}/api/notifications/read`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error("Failed to mark notifications read");
    const data = await res.json();
    return data.success;
  },

  async deleteNotification(id: number): Promise<boolean> {
    const res = await customFetch(`${API_BASE}/api/notifications/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to delete notification");
    const data = await res.json();
    return data.success;
  },

  // ANALYTICS
  async getAnalytics(): Promise<AnalyticsSummary> {
    const res = await customFetch(`${API_BASE}/api/analytics`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Failed to fetch analytics summary: ${errData.error || res.statusText}`);
    }
    return res.json();
  },

  // SETTINGS
  async getSettings(): Promise<Settings> {
    const res = await customFetch(`${API_BASE}/api/settings`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
  },

  async saveSettings(settings: Settings): Promise<boolean> {
    const res = await customFetch(`${API_BASE}/api/settings`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error("Failed to save settings");
    const data = await res.json();
    return data.success;
  },

  // DECISION ENGINE & SIMULATOR
  async getWorkspaceAnalysis(forceRefresh?: boolean): Promise<any> {
    const res = await customFetch(`${API_BASE}/api/ai/decision-engine?force=${!!forceRefresh}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to run AI workspace analysis");
    return res.json();
  },

  async getAILogs(): Promise<any[]> {
    const res = await customFetch(`${API_BASE}/api/ai/logs`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch AI logs");
    return res.json();
  },

  async simulateDay(): Promise<any> {
    const res = await customFetch(`${API_BASE}/api/ai/what-if`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to run day simulation");
    return res.json();
  }
};
