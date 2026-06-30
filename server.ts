import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initDB, db } from "./src/server/db.ts";
import {
  aiPrioritizeTask,
  aiGenerateDailyPlan,
  aiRescueDeadlines,
  aiBreakdownTask,
  aiProductivityCoach,
  aiAnalyzeWorkspace,
  aiWhatIfSimulator,
  getGeminiAI,
  isAIConfigured,
  generateContentWithFallback,
} from "./src/server/gemini.ts";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize database
initDB();

// AUTHENTICATION HELPER
function getUserId(req: any, res: any): number | null {
  const userIdHeader = req.headers["x-user-id"];
  if (!userIdHeader) {
    res.status(401).json({ error: "Unauthorized: Please log in." });
    return null;
  }
  const id = parseInt(userIdHeader as string, 10);
  if (isNaN(id)) {
    res.status(401).json({ error: "Unauthorized: Invalid user ID." });
    return null;
  }
  // Verify that the user actually exists in the database
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) {
    res.status(401).json({ error: "Unauthorized: Session expired or database reset. Please log in again." });
    return null;
  }
  return id;
}

// HELPER: Invalidate AI analysis cache on workspace mutations
function invalidateAnalysisCache(userId: number) {
  try {
    db.prepare("DELETE FROM settings WHERE userId = ? AND key = 'latest_ai_analysis'").run(userId);
  } catch (err) {
    console.error("Cache invalidation failed:", err);
  }
}

// HELPER: Fetch active tasks for context
function getTasksContext(userId: number) {
  const tasks = db.prepare("SELECT * FROM tasks WHERE userId = ? AND status != 'archived'").all(userId) as Array<any>;
  return tasks.map(task => {
    const subtasks = db.prepare("SELECT * FROM subtasks WHERE userId = ? AND task_id = ?").all(userId, task.id);
    return { ...task, subtasks };
  });
}

function formatApiError(err: any): string {
  if (!err) return "Unknown connection issue";
  let msg = err.message || String(err);
  
  if (typeof msg === "string" && msg.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.error && parsed.error.message) {
        msg = parsed.error.message;
      } else if (parsed.message) {
        msg = parsed.message;
      }
    } catch {
      // Keep original if parsing fails
    }
  }
  
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("429")) {
    return "Google AI Studio Gemini API free-tier rate limit/quota exceeded. Please try again in 30-60 seconds.";
  }
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid") || msg.includes("key is invalid")) {
    return "Invalid Gemini API key. Please verify your GEMINI_API_KEY environment variable.";
  }
  
  return msg;
}

// ==========================================
// 0. AUTHENTICATION ENDPOINTS
// ==========================================

app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    const cleanUsername = username.trim().toLowerCase();
    
    // Check if user exists
    const existingUser = db.prepare("SELECT * FROM users WHERE LOWER(username) = ?").get(cleanUsername) as any;
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists." });
    }

    const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(cleanUsername, password);
    const userId = result.lastInsertRowid;

    // Seed default settings for the new user
    const insertSetting = db.prepare("INSERT INTO settings (userId, key, value) VALUES (?, ?, ?)");
    insertSetting.run(userId, "work_hours_start", "09:00");
    insertSetting.run(userId, "work_hours_end", "18:00");
    insertSetting.run(userId, "productivity_goal", "85");
    insertSetting.run(userId, "rescue_mode_enabled", "true");
    insertSetting.run(userId, "auto_replan_enabled", "true");
    insertSetting.run(userId, "user_name", username);

    // Initial notification
    db.prepare("INSERT INTO notifications (userId, title, message, type) VALUES (?, ?, ?, ?)").run(
      userId,
      "Welcome to DeadlinePilot AI",
      "Welcome to DeadlinePilot AI! Let's create your first task.",
      "info"
    );

    // Initial coach chat message
    db.prepare("INSERT INTO chat_history (userId, sender, message) VALUES (?, ?, ?)").run(
      userId,
      "assistant",
      "Welcome to DeadlinePilot AI! I am your AI assistant. I have analyzed your schedule and it looks completely clean. Let's create your first task together!"
    );

    res.json({ id: userId, username });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    const cleanUsername = username.trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE LOWER(username) = ?").get(cleanUsername) as any;
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    
    res.json({ id: user.id, username: user.username });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", (req, res) => {
  try {
    const userIdHeader = req.headers["x-user-id"];
    if (!userIdHeader) {
      return res.json(null);
    }
    const id = parseInt(userIdHeader as string, 10);
    if (isNaN(id)) {
      return res.json(null);
    }
    const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(id) as any;
    res.json(user || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 1. TASKS ENDPOINTS
// ==========================================

// Get all tasks with subtasks
app.get("/api/tasks", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const tasks = db.prepare("SELECT * FROM tasks WHERE userId = ? ORDER BY id DESC").all(userId) as Array<any>;
    const tasksWithSubtasks = tasks.map((task) => {
      const subtasks = db.prepare("SELECT * FROM subtasks WHERE userId = ? AND task_id = ?").all(userId, task.id);
      return { ...task, subtasks };
    });
    res.json(tasksWithSubtasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create task with autonomous AI prioritization
app.post("/api/tasks", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { title, description, priority, deadline, estimated_hours, category, difficulty, notes, subtasks } = req.body;

    if (!title || !deadline) {
      return res.status(400).json({ error: "Title and deadline are required fields." });
    }

    // Prepare workspace context for AI assessment
    const otherTasks = db.prepare("SELECT title, deadline, priority, status FROM tasks WHERE userId = ? AND status != 'completed' AND status != 'archived'").all(userId) as Array<any>;
    
    // Call AI to prioritize (has safe local fallback)
    const aiAssessment = await aiPrioritizeTask(
      { title, description, priority: priority || "medium", deadline, estimated_hours: parseFloat(estimated_hours) || 1, category: category || "work", difficulty: difficulty || "medium", status: "todo" },
      otherTasks
    );

    // Insert task
    const insertStmt = db.prepare(`
      INSERT INTO tasks (
        userId, title, description, priority, deadline, estimated_hours, category, difficulty, status, progress, notes, ai_urgency, ai_risk, ai_reasoning, ai_suggested_start
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      userId,
      title,
      description || "",
      priority || "medium",
      deadline,
      parseFloat(estimated_hours) || 1.0,
      category || "work",
      difficulty || "medium",
      "todo",
      0,
      notes || "",
      aiAssessment.urgency_score || 5.0,
      aiAssessment.risk_score || 0.1,
      aiAssessment.reasoning || "Prioritized locally",
      aiAssessment.suggested_start_time || deadline
    );

    const taskId = result.lastInsertRowid;

    // Create subtasks if provided
    if (subtasks && Array.isArray(subtasks)) {
      const subtaskStmt = db.prepare("INSERT INTO subtasks (userId, task_id, title, completed) VALUES (?, ?, ?, 0)");
      for (const titleStr of subtasks) {
        if (titleStr && typeof titleStr === "string") {
          subtaskStmt.run(userId, taskId, titleStr.trim());
        }
      }
    }

    // Insert AI Log
    db.prepare("INSERT INTO ai_logs (userId, action, prompt, response) VALUES (?, ?, ?, ?)").run(
      userId,
      "Task Prioritization",
      `Prioritized new task: ${title}`,
      JSON.stringify(aiAssessment)
    );

    // Create an automated notification
    if (aiAssessment.risk_score > 0.6) {
      db.prepare("INSERT INTO notifications (userId, title, message, type) VALUES (?, ?, ?, ?)").run(
        userId,
        "⚠️ High-Risk Task Added",
        `'${title}' is flagged at high failure risk (${Math.round(aiAssessment.risk_score * 100)}%). AI recommends starting by ${new Date(aiAssessment.suggested_start_time).toLocaleString()}.`,
        "warning"
      );
    }

    // Retrieve full newly created task
    const newTask = db.prepare("SELECT * FROM tasks WHERE userId = ? AND id = ?").get(userId, taskId) as any;
    const newSubtasks = db.prepare("SELECT * FROM subtasks WHERE userId = ? AND task_id = ?").all(userId, taskId);
    
    invalidateAnalysisCache(userId);
    res.status(201).json({ ...newTask, subtasks: newSubtasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
app.put("/api/tasks/:id", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { id } = req.params;
    const { title, description, priority, deadline, estimated_hours, category, difficulty, status, progress, notes, subtasks } = req.body;

    const existingTask = db.prepare("SELECT * FROM tasks WHERE userId = ? AND id = ?").get(userId, id) as any;
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found." });
    }

    let aiUrgency = existingTask.ai_urgency;
    let aiRisk = existingTask.ai_risk;
    let aiReasoning = existingTask.ai_reasoning;
    let aiSuggestedStart = existingTask.ai_suggested_start;

    // Re-run prioritization if deadline, priority, or estimated_hours changed
    if (
      deadline !== existingTask.deadline ||
      priority !== existingTask.priority ||
      parseFloat(estimated_hours) !== existingTask.estimated_hours
    ) {
      const otherTasks = db.prepare("SELECT title, deadline, priority, status FROM tasks WHERE userId = ? AND id != ? AND status != 'completed' AND status != 'archived'").all(userId, id) as Array<any>;
      const aiAssessment = await aiPrioritizeTask(
        {
          title: title || existingTask.title,
          description: description || existingTask.description,
          priority: priority || existingTask.priority,
          deadline: deadline || existingTask.deadline,
          estimated_hours: parseFloat(estimated_hours) || existingTask.estimated_hours,
          category: category || existingTask.category,
          difficulty: difficulty || existingTask.difficulty,
          status: status || existingTask.status
        },
        otherTasks
      );
      aiUrgency = aiAssessment.urgency_score;
      aiRisk = aiAssessment.risk_score;
      aiReasoning = aiAssessment.reasoning;
      aiSuggestedStart = aiAssessment.suggested_start_time;
    }

    // Perform update
    const updateStmt = db.prepare(`
      UPDATE tasks SET
        title = ?, description = ?, priority = ?, deadline = ?, estimated_hours = ?,
        category = ?, difficulty = ?, status = ?, progress = ?, notes = ?,
        ai_urgency = ?, ai_risk = ?, ai_reasoning = ?, ai_suggested_start = ?
      WHERE userId = ? AND id = ?
    `);

    updateStmt.run(
      title || existingTask.title,
      description !== undefined ? description : existingTask.description,
      priority || existingTask.priority,
      deadline || existingTask.deadline,
      estimated_hours !== undefined ? parseFloat(estimated_hours) : existingTask.estimated_hours,
      category || existingTask.category,
      difficulty || existingTask.difficulty,
      status || existingTask.status,
      progress !== undefined ? parseInt(progress) : existingTask.progress,
      notes !== undefined ? notes : existingTask.notes,
      aiUrgency,
      aiRisk,
      aiReasoning,
      aiSuggestedStart,
      userId,
      id
    );

    // Update subtasks if provided
    if (subtasks && Array.isArray(subtasks)) {
      // Simple delete-insert update pattern
      db.prepare("DELETE FROM subtasks WHERE userId = ? AND task_id = ?").run(userId, id);
      const subtaskStmt = db.prepare("INSERT INTO subtasks (userId, task_id, title, completed) VALUES (?, ?, ?, ?)");
      for (const st of subtasks) {
        subtaskStmt.run(userId, id, st.title, st.completed ? 1 : 0);
      }
    }

    // Trigger daily analytics update if task was marked complete
    if (status === "completed" && existingTask.status !== "completed") {
      const todayStr = new Date().toISOString().split("T")[0];
      db.prepare(`
        INSERT INTO analytics (userId, date, completed_tasks, productivity_score)
        VALUES (?, ?, 1, 80)
        ON CONFLICT(userId, date) DO UPDATE SET 
          completed_tasks = completed_tasks + 1,
          productivity_score = MIN(100, productivity_score + 5)
      `).run(userId, todayStr);

      db.prepare("INSERT INTO notifications (userId, title, message, type) VALUES (?, ?, ?, ?)").run(
        userId,
        "🎉 Goal Conquered!",
        `Congratulations! You finished the task '${title || existingTask.title}' before the deadline. Pilot autopilot tracking updated.`,
        "success"
      );
    }

    const updatedTask = db.prepare("SELECT * FROM tasks WHERE userId = ? AND id = ?").get(userId, id) as any;
    const updatedSubtasks = db.prepare("SELECT * FROM subtasks WHERE userId = ? AND task_id = ?").all(userId, id);

    invalidateAnalysisCache(userId);
    res.json({ ...updatedTask, subtasks: updatedSubtasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Subtask
app.post("/api/tasks/:id/toggle-subtask", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { id } = req.params;
    const { subtaskId, completed } = req.body;

    // Validate ownership
    const existingTask = db.prepare("SELECT * FROM tasks WHERE userId = ? AND id = ?").get(userId, id);
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found." });
    }

    db.prepare("UPDATE subtasks SET completed = ? WHERE userId = ? AND id = ? AND task_id = ?").run(completed ? 1 : 0, userId, subtaskId, id);
    
    // Recalculate progress of task based on subtasks
    const subtasks = db.prepare("SELECT completed FROM subtasks WHERE userId = ? AND task_id = ?").all(userId, id) as Array<{ completed: number }>;
    if (subtasks.length > 0) {
      const completedCount = subtasks.filter(s => s.completed === 1).length;
      const progressPercent = Math.round((completedCount / subtasks.length) * 100);
      db.prepare("UPDATE tasks SET progress = ? WHERE userId = ? AND id = ?").run(progressPercent, userId, id);
    }

    const task = db.prepare("SELECT * FROM tasks WHERE userId = ? AND id = ?").get(userId, id) as any;
    const refreshedSubtasks = db.prepare("SELECT * FROM subtasks WHERE userId = ? AND task_id = ?").all(userId, id);

    invalidateAnalysisCache(userId);
    res.json({ ...task, subtasks: refreshedSubtasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
app.delete("/api/tasks/:id", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { id } = req.params;
    const existingTask = db.prepare("SELECT * FROM tasks WHERE userId = ? AND id = ?").get(userId, id);
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found." });
    }

    db.prepare("DELETE FROM tasks WHERE userId = ? AND id = ?").run(userId, id);
    invalidateAnalysisCache(userId);
    res.json({ success: true, message: "Task deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Archive task
app.post("/api/tasks/:id/archive", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { id } = req.params;
    const existingTask = db.prepare("SELECT * FROM tasks WHERE userId = ? AND id = ?").get(userId, id);
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found." });
    }

    db.prepare("UPDATE tasks SET status = 'archived' WHERE userId = ? AND id = ?").run(userId, id);
    invalidateAnalysisCache(userId);
    res.json({ success: true, message: "Task archived successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Duplicate task
app.post("/api/tasks/:id/duplicate", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { id } = req.params;
    const original = db.prepare("SELECT * FROM tasks WHERE userId = ? AND id = ?").get(userId, id) as any;
    if (!original) {
      return res.status(404).json({ error: "Task not found." });
    }

    const insertStmt = db.prepare(`
      INSERT INTO tasks (
        userId, title, description, priority, deadline, estimated_hours, category, difficulty, status, progress, notes, ai_urgency, ai_risk, ai_reasoning, ai_suggested_start
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      userId,
      `${original.title} (Copy)`,
      original.description,
      original.priority,
      original.deadline,
      original.estimated_hours,
      original.category,
      original.difficulty,
      original.status,
      original.progress,
      original.notes,
      original.ai_urgency,
      original.ai_risk,
      original.ai_reasoning,
      original.ai_suggested_start
    );

    const newTaskId = result.lastInsertRowid;

    // Duplicate subtasks
    const subtasks = db.prepare("SELECT * FROM subtasks WHERE userId = ? AND task_id = ?").all(userId, id) as Array<any>;
    const subtaskStmt = db.prepare("INSERT INTO subtasks (userId, task_id, title, completed) VALUES (?, ?, ?, ?)");
    for (const sub of subtasks) {
      subtaskStmt.run(userId, newTaskId, sub.title, sub.completed);
    }

    const duplicated = db.prepare("SELECT * FROM tasks WHERE userId = ? AND id = ?").get(userId, newTaskId) as any;
    const duplicatedSubtasks = db.prepare("SELECT * FROM subtasks WHERE userId = ? AND task_id = ?").all(userId, newTaskId);

    res.json({ ...duplicated, subtasks: duplicatedSubtasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 2. AI & SCHEDULING SERVICES
// ==========================================

// GET cached Daily Plan or create initial
app.get("/api/ai/plan", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const cachedPlan = db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'daily_schedule'").get(userId) as { value: string } | undefined;
    if (cachedPlan) {
      return res.json(JSON.parse(cachedPlan.value));
    }

    // Otherwise, generate initial daily plan
    const tasks = db.prepare("SELECT * FROM tasks WHERE userId = ? AND status != 'completed' AND status != 'archived'").all(userId) as Array<any>;
    const startHourSetting = db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'work_hours_start'").get(userId) as { value: string } | undefined;
    const endHourSetting = db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'work_hours_end'").get(userId) as { value: string } | undefined;

    const plan = await aiGenerateDailyPlan(tasks, {
      work_hours_start: startHourSetting?.value || "09:00",
      work_hours_end: endHourSetting?.value || "18:00"
    });

    db.prepare("INSERT OR REPLACE INTO settings (userId, key, value) VALUES (?, 'daily_schedule', ?)").run(userId, JSON.stringify(plan));
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Force regenerate Daily Plan
app.post("/api/ai/plan/generate", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const tasks = db.prepare("SELECT * FROM tasks WHERE userId = ? AND status != 'completed' AND status != 'archived'").all(userId) as Array<any>;
    const startHourSetting = db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'work_hours_start'").get(userId) as { value: string } | undefined;
    const endHourSetting = db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'work_hours_end'").get(userId) as { value: string } | undefined;

    const plan = await aiGenerateDailyPlan(tasks, {
      work_hours_start: startHourSetting?.value || "09:00",
      work_hours_end: endHourSetting?.value || "18:00"
    });

    db.prepare("INSERT OR REPLACE INTO settings (userId, key, value) VALUES (?, 'daily_schedule', ?)").run(userId, JSON.stringify(plan));
    
    // Log AI action
    db.prepare("INSERT INTO ai_logs (userId, action, prompt, response) VALUES (?, ?, ?, ?)").run(
      userId,
      "Daily Planning",
      `Regenerated daily plan based on ${tasks.length} active tasks.`,
      JSON.stringify(plan)
    );

    db.prepare("INSERT INTO notifications (userId, title, message, type) VALUES (?, ?, ?, ?)").run(
      userId,
      "🔄 AI Schedule Recalibrated",
      "DeadlinePilot has restructured your daily schedule blocks to optimize work-break ratios and buffer margins.",
      "success"
    );

    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run AI Prioritize ALL tasks
app.post("/api/ai/prioritize-all", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const tasks = db.prepare("SELECT * FROM tasks WHERE userId = ? AND status != 'completed' AND status != 'archived'").all(userId) as Array<any>;
    const updatedTasks = [];

    for (const task of tasks) {
      const otherTasks = tasks.filter(t => t.id !== task.id).map(t => ({ title: t.title, deadline: t.deadline, priority: t.priority, status: t.status }));
      const assessment = await aiPrioritizeTask(task, otherTasks);

      db.prepare(`
        UPDATE tasks SET 
          ai_urgency = ?, ai_risk = ?, ai_reasoning = ?, ai_suggested_start = ?
        WHERE userId = ? AND id = ?
      `).run(assessment.urgency_score, assessment.risk_score, assessment.reasoning, assessment.suggested_start_time, userId, task.id);

      updatedTasks.push({ ...task, ai_urgency: assessment.urgency_score, ai_risk: assessment.risk_score, ai_reasoning: assessment.reasoning, ai_suggested_start: assessment.suggested_start_time });
    }

    res.json({ success: true, message: `Successfully re-prioritized ${tasks.length} active tasks.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Deadline Rescue Assessment
app.get("/api/ai/rescue", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const tasks = db.prepare("SELECT * FROM tasks WHERE userId = ? AND status != 'completed' AND status != 'archived'").all(userId) as Array<any>;
    const rescueAssessment = await aiRescueDeadlines(tasks);
    res.json(rescueAssessment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// EXECUTE AI Deadline Rescue Operation
app.post("/api/ai/rescue/execute", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { postponed_tasks_ids } = req.body;

    if (postponed_tasks_ids && Array.isArray(postponed_tasks_ids)) {
      const stmt = db.prepare(`
        UPDATE tasks SET 
          priority = 'low', 
          notes = 'AI AUTO-RESCUE POSTPONED: Delayed to secure high-priority critical deadline pipeline.' || CHAR(10) || COALESCE(notes, '')
        WHERE userId = ? AND id = ?
      `);
      for (const taskId of postponed_tasks_ids) {
        stmt.run(userId, taskId);
      }
    }

    // Put setting "rescue_mode_active"
    db.prepare("INSERT OR REPLACE INTO settings (userId, key, value) VALUES (?, 'rescue_mode_active', 'true')").run(userId);

    // Insert notification
    db.prepare("INSERT INTO notifications (userId, title, message, type) VALUES (?, ?, ?, ?)").run(
      userId,
      "🚀 Deadline Rescue Plan Activated!",
      `Muted ${postponed_tasks_ids?.length || 0} low-priority tasks. Bandwidth has been redirected to secure at-risk milestones.`,
      "rescue"
    );

    // Force regenerate daily plan as part of replanning
    const tasks = db.prepare("SELECT * FROM tasks WHERE userId = ? AND status != 'completed' AND status != 'archived'").all(userId) as Array<any>;
    const startHourSetting = db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'work_hours_start'").get(userId) as { value: string } | undefined;
    const endHourSetting = db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'work_hours_end'").get(userId) as { value: string } | undefined;
    
    const newPlan = await aiGenerateDailyPlan(tasks, {
      work_hours_start: startHourSetting?.value || "09:00",
      work_hours_end: endHourSetting?.value || "18:00"
    });
    db.prepare("INSERT OR REPLACE INTO settings (userId, key, value) VALUES (?, 'daily_schedule', ?)").run(userId, JSON.stringify(newPlan));

    res.json({ success: true, message: "Rescue plan executed. Low priority tasks moved, schedule replanned." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Task Breakdown API
app.post("/api/ai/breakdown", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required to perform breakdown." });
    }

    const subtasks = await aiBreakdownTask(title, description);
    res.json(subtasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST AI Productivity Coach Questions
app.post("/api/ai/coach", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "A question is required for coaching analysis." });
    }

    const tasks = getTasksContext(userId);
    const analytics = db.prepare("SELECT * FROM analytics WHERE userId = ? ORDER BY date DESC LIMIT 7").all(userId);
    const settingsRows = db.prepare("SELECT * FROM settings WHERE userId = ?").all(userId) as Array<any>;
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

    const answer = await aiProductivityCoach(question, tasks, analytics, settings);
    res.json({ answer });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 3. CHAT ASSISTANT ENDPOINT
// ==========================================

// Get chat logs
app.get("/api/ai/chat", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const chatLogs = db.prepare("SELECT * FROM chat_history WHERE userId = ? ORDER BY id ASC").all(userId);
    res.json(chatLogs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post chat message with FULL workspace context
app.post("/api/ai/chat", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Insert user chat log
    db.prepare("INSERT INTO chat_history (userId, sender, message) VALUES (?, 'user', ?)").run(userId, message);

    if (!isAIConfigured()) {
      const activeCount = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE userId = ? AND status != 'completed'").get(userId) as { count: number }).count;
      const responseText = `I am running in local-pilot mode without active Gemini API keys.
However, I can still see your workspace telemetry! You currently have ${activeCount} active tasks.
Once you configure the \`GEMINI_API_KEY\` in your secrets panel, I can dynamically schedule items, draft subtasks, and talk live!`;
      db.prepare("INSERT INTO chat_history (userId, sender, message) VALUES (?, 'assistant', ?)").run(userId, responseText);
      return res.json({ response: responseText });
    }

    // Fetch context
    const tasks = getTasksContext(userId);
    const notifications = db.prepare("SELECT * FROM notifications WHERE userId = ? ORDER BY id DESC LIMIT 5").all(userId);
    const settingsRows = db.prepare("SELECT * FROM settings WHERE userId = ?").all(userId) as Array<any>;
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    const chatLogs = db.prepare("SELECT * FROM chat_history WHERE userId = ? ORDER BY id DESC LIMIT 10").all(userId) as Array<any>;
    const chatHistoryContext = chatLogs.reverse().map(c => `${c.sender}: ${c.message}`).join("\n");

    let assistantResponse = "";
    try {
      const response = await generateContentWithFallback({
        model: "gemini-3.5-flash",
        contents: `
          You are "DeadlinePilot AI", an elite, autonomous, full-stack AI productivity companion.
          Your goal is to guide the user in optimizing their active workday, predicting and resolving deadline failures, and reducing overload.
          You have direct command execution privileges over their database context. Speak with professional, highly supportive composure.

          Workspace Telemetry:
          Tasks portfolio: ${JSON.stringify(tasks)}
          Settings: ${JSON.stringify(settings)}
          Recent alerts: ${JSON.stringify(notifications)}

          Conversation History:
          ${chatHistoryContext}

          Latest User Message: "${message}"

          Provide a very engaging response. If the user asks to add a task, do a breakdown, or delay a task, explain what changes they can do or that you suggest doing, and present concrete advice. Use beautiful markdown layout with lists. Keep it short (max 3 small paragraphs).
        `,
      });
      assistantResponse = response.text || "I processed your request, pilot, but the output telemetry stream was blank. Let's try again.";
    } catch (apiError: any) {
      console.error("Gemini chat API failed, falling back to local simulation:", apiError);
      
      const activeCount = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE userId = ? AND status != 'completed' AND status != 'archived'").get(userId) as { count: number }).count;
      const nearestTask = db.prepare("SELECT title, deadline FROM tasks WHERE userId = ? AND status != 'completed' AND status != 'archived' ORDER BY deadline ASC LIMIT 1").get(userId) as { title: string; deadline: string } | undefined;
      
      let nearestText = "";
      if (nearestTask) {
        nearestText = `Your closest milestone is **${nearestTask.title}** due on *${new Date(nearestTask.deadline).toLocaleDateString()}*.`;
      } else {
        nearestText = "Your task pipeline is currently completely empty.";
      }
      
      const cleanErrorMsg = formatApiError(apiError);
      assistantResponse = `### DeadlinePilot AI [Offline Mode] 🛡_

I am running in local offline mode because I had trouble connecting to the Gemini AI API (*${cleanErrorMsg}*).

However, I can still see your workspace database!
*   **Active Tasks**: You have **${activeCount}** active task(s) currently loaded in your scheduler.
*   **Next Deadline**: ${nearestText}

**Local Recommendation**:
To manage your schedule locally:
1. Try breaking down large tasks into smaller subtasks using the **Breakdown** button on your task card.
2. If you are feeling overwhelmed, you can activate **Deadline Rescue Mode** from the Risk Center to postpone lower-priority tasks and protect your primary target.

*Once your \`GEMINI_API_KEY\` is updated or the network connection stabilizes, full autonomous chat abilities will resume.*`;
    }

    db.prepare("INSERT INTO chat_history (userId, sender, message) VALUES (?, 'assistant', ?)").run(userId, assistantResponse);

    res.json({ response: assistantResponse });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 4. NOTIFICATIONS ENDPOINTS
// ==========================================

app.get("/api/notifications", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const notifications = db.prepare("SELECT * FROM notifications WHERE userId = ? ORDER BY id DESC").all(userId);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications/read", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { id } = req.body;
    if (id) {
      db.prepare("UPDATE notifications SET read = 1 WHERE userId = ? AND id = ?").run(userId, id);
    } else {
      db.prepare("UPDATE notifications SET read = 1 WHERE userId = ?").run(userId);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/notifications/:id", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const { id } = req.params;
    db.prepare("DELETE FROM notifications WHERE userId = ? AND id = ?").run(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 5. ANALYTICS & DASHBOARD METRICS
// ==========================================

app.get("/api/analytics", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const history = db.prepare("SELECT * FROM analytics WHERE userId = ? ORDER BY date ASC LIMIT 14").all(userId);
    const tasks = db.prepare("SELECT * FROM tasks WHERE userId = ?").all(userId) as Array<any>;

    // Calculate dynamic scores
    const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
    
    // Risk Meter calculation
    const highRiskCount = activeTasks.filter(t => t.ai_risk > 0.6).length;
    let riskScore = 15; // baseline
    if (activeTasks.length > 0) {
      riskScore = Math.min(100, Math.round((highRiskCount / activeTasks.length) * 80) + 10);
    }

    // Productivity Score based on completed vs overdue
    const now = new Date();
    const overdueTasks = activeTasks.filter(t => new Date(t.deadline).getTime() < now.getTime());
    let productivityScore = 80;
    if (tasks.length > 0) {
      productivityScore = Math.max(10, Math.min(100, 80 + completedTasks.length * 5 - overdueTasks.length * 10 - highRiskCount * 4));
    } else {
      productivityScore = 100; // Empty slate default high score
    }

    // Task categories breakdown
    const categories: Record<string, number> = {};
    tasks.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + 1;
    });

    const categoryData = Object.keys(categories).map(cat => ({
      name: cat,
      value: categories[cat]
    }));

    // Recent AI decisions from logs
    const recentDecisions = db.prepare("SELECT * FROM ai_logs WHERE userId = ? ORDER BY id DESC LIMIT 5").all(userId);

    res.json({
      history,
      productivityScore,
      riskScore,
      completionRate,
      highRiskCount,
      overdueCount: overdueTasks.length,
      categoryData,
      recentDecisions,
      totals: {
        all: tasks.length,
        active: activeTasks.length,
        completed: completedTasks.length,
        archived: tasks.filter(t => t.status === 'archived').length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 6. SETTINGS ENDPOINTS
// ==========================================

app.get("/api/settings", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const settingsRows = db.prepare("SELECT * FROM settings WHERE userId = ?").all(userId) as Array<{ key: string; value: string }>;
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const body = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (userId, key, value) VALUES (?, ?, ?)");
    for (const key of Object.keys(body)) {
      stmt.run(userId, key, String(body[key]));
    }
    res.json({ success: true, message: "Settings saved successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 7. CALENDAR & SCHEDULE OVERLAY
// ==========================================

app.get("/api/calendar", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const tasks = db.prepare("SELECT id, title, deadline, priority, status, category FROM tasks WHERE userId = ? AND status != 'archived'").all(userId) as Array<any>;
    const cachedPlan = db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'daily_schedule'").get(userId) as { value: string } | undefined;
    
    res.json({
      tasks,
      aiScheduleOverlay: cachedPlan ? JSON.parse(cachedPlan.value) : []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 8. AUTONOMOUS DECISION ENGINE & SIMULATOR ENDPOINTS
// ==========================================

// GET /api/ai/decision-engine - Workspace analysis with caching support
app.get("/api/ai/decision-engine", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const force = req.query.force === "true";
    const cacheRow = db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'latest_ai_analysis'").get(userId) as { value: string } | undefined;
    
    if (cacheRow && !force) {
      return res.json(JSON.parse(cacheRow.value));
    }

    const tasks = getTasksContext(userId);
    const settingsRows = db.prepare("SELECT * FROM settings WHERE userId = ?").all(userId) as Array<{ key: string; value: string }>;
    const settings = settingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

    const analysis = await aiAnalyzeWorkspace(tasks, settings);

    db.prepare("INSERT OR REPLACE INTO settings (userId, key, value) VALUES (?, 'latest_ai_analysis', ?)")
      .run(userId, JSON.stringify(analysis));

    const riskLevel = analysis.risk_meter?.overall_productivity_risk || "Green";
    const confidence = analysis.recommendations?.[0]?.why?.confidence_score || 92;
    const recCount = analysis.recommendations?.length || 0;
    
    db.prepare("INSERT INTO ai_logs (userId, action, prompt, response) VALUES (?, ?, ?, ?)")
      .run(
        userId,
        `Workspace Analysis: ${riskLevel} Risk`,
        `Autonomous sweep detected ${recCount} recommendations with ${confidence}% confidence score.`,
        JSON.stringify(analysis)
      );

    res.json(analysis);
  } catch (error: any) {
    console.error("Decision engine API failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/logs - Retrieves all autonomous AI logs chronologically
app.get("/api/ai/logs", (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const logs = db.prepare("SELECT * FROM ai_logs WHERE userId = ? ORDER BY id DESC").all(userId) as Array<any>;
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/what-if - Run "What-If" simulation scenario comparison
app.get("/api/ai/what-if", async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === null) return;

  try {
    const tasks = getTasksContext(userId);
    const simulation = await aiWhatIfSimulator(tasks);
    
    db.prepare("INSERT INTO ai_logs (userId, action, prompt, response) VALUES (?, ?, ?, ?)")
      .run(
        userId,
        "What-If Simulation Run",
        "Evaluated Scenario A (Follow AI) vs Scenario B (Ignore Suggestions) workloads.",
        JSON.stringify(simulation)
      );
      
    res.json(simulation);
  } catch (error: any) {
    console.error("What-if simulator API failed:", error);
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// VITE INTEGRATION FOR ASSETS
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DeadlinePilot AI] running server on http://0.0.0.0:${PORT}`);
  });
}

startServer();
