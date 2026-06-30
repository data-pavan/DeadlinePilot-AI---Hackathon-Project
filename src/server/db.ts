import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "deadlinepilot.db");
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and foreign keys support
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize Database Schema
export function initDB() {
  let needUpgrade = false;
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  
  if (!tableCheck) {
    needUpgrade = true;
  } else {
    // Check if tasks table has userId column
    const tasksTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").get();
    if (tasksTableCheck) {
      const columns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
      const hasUserId = columns.some(col => col.name === "userId");
      if (!hasUserId) {
        needUpgrade = true;
      }
    }
  }

  if (needUpgrade) {
    console.log("Upgrading database to user-isolated schema...");
    // Drop existing old tables
    db.exec(`
      DROP TABLE IF EXISTS subtasks;
      DROP TABLE IF EXISTS tasks;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS analytics;
      DROP TABLE IF EXISTS chat_history;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS ai_logs;
      DROP TABLE IF EXISTS users;
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      deadline TEXT NOT NULL,
      estimated_hours REAL DEFAULT 1,
      category TEXT DEFAULT 'work',
      difficulty TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'todo',
      progress INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ai_urgency REAL DEFAULT 0.0,
      ai_risk REAL DEFAULT 0.0,
      ai_reasoning TEXT,
      ai_suggested_start TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      read INTEGER DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL,
      productivity_score INTEGER DEFAULT 0,
      completed_tasks INTEGER DEFAULT 0,
      tasks_at_risk INTEGER DEFAULT 0,
      UNIQUE(userId, date),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      userId INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (userId, key),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      action TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_decision_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      event TEXT NOT NULL,
      details TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      duration_minutes INTEGER DEFAULT 25,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_ai_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      plan_json TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Check if seeded users exist
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    console.log("Seeding User A and User B into database...");
    const insertUser = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    
    const resA = insertUser.run("usera", "password");
    const userIdA = resA.lastInsertRowid;
    
    const resB = insertUser.run("userb", "password");
    const userIdB = resB.lastInsertRowid;

    // User A (5 tasks)
    const insertTask = db.prepare(`
      INSERT INTO tasks (
        userId, title, description, priority, deadline, estimated_hours, category, difficulty, status, progress, notes,
        ai_urgency, ai_risk, ai_reasoning, ai_suggested_start
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSubtask = db.prepare(`
      INSERT INTO subtasks (userId, task_id, title, completed) VALUES (?, ?, ?, ?)
    `);

    const tA1 = insertTask.run(
      userIdA,
      "Complete Q3 Project Proposal",
      "Write and polish the final executive summary for the upcoming presentation.",
      "high",
      "2026-07-02",
      4,
      "work",
      "medium",
      "todo",
      0,
      "Need approval from product lead before submitting.",
      0.8,
      0.2,
      "High urgency due to upcoming project submission date.",
      "2026-06-30T09:00"
    );
    insertSubtask.run(userIdA, tA1.lastInsertRowid, "Draft executive summary", 0);
    insertSubtask.run(userIdA, tA1.lastInsertRowid, "Analyze financial projection sheets", 0);

    const tA2 = insertTask.run(
      userIdA,
      "Design database schema for auth",
      "Create relational tables with user-isolation and SQLite.",
      "medium",
      "2026-07-05",
      2,
      "work",
      "medium",
      "todo",
      0,
      "Make sure to design relationships between Users and all entities.",
      0.5,
      0.1,
      "Moderate priority. Can start after proposal completed.",
      "2026-07-01T14:00"
    );
    insertSubtask.run(userIdA, tA2.lastInsertRowid, "Draft users table design", 0);

    const tA3 = insertTask.run(
      userIdA,
      "Draft client onboarding email",
      "Email template for new enterprise pilot users.",
      "low",
      "2026-07-10",
      1,
      "communication",
      "easy",
      "todo",
      0,
      "",
      0.2,
      0.0,
      "Low urgency, deadline is quite far.",
      "2026-07-03T11:00"
    );

    const tA4 = insertTask.run(
      userIdA,
      "Review budget spreadsheets",
      "Verify all line items against the department spending cap.",
      "high",
      "2026-06-30",
      3,
      "finance",
      "hard",
      "todo",
      0,
      "Confirm marketing expenses list specifically.",
      0.9,
      0.5,
      "Critical path item. Needs review by tomorrow morning.",
      "2026-06-29T13:00"
    );
    insertSubtask.run(userIdA, tA4.lastInsertRowid, "Check Q2 actuals", 0);

    const tA5 = insertTask.run(
      userIdA,
      "Refactor authentication middlewares",
      "Ensure all endpoints validate User ID correctly.",
      "medium",
      "2026-07-08",
      5,
      "work",
      "hard",
      "todo",
      0,
      "Test isolation with invalid credentials too.",
      0.6,
      0.3,
      "Complex task, requires dedicated focus blocks.",
      "2026-07-02T10:00"
    );

    // User B (3 tasks)
    const tB1 = insertTask.run(
      userIdB,
      "Prepare vacation itinerary",
      "Plan flights, accommodation, and daily activities for summer trip.",
      "medium",
      "2026-07-15",
      6,
      "personal",
      "medium",
      "todo",
      0,
      "Check hotel options near central station.",
      0.4,
      0.1,
      "Personal task, long lead time available.",
      "2026-07-05T10:00"
    );
    insertSubtask.run(userIdB, tB1.lastInsertRowid, "Search airline tickets", 0);
    insertSubtask.run(userIdB, tB1.lastInsertRowid, "Book hotel accommodations", 0);

    const tB2 = insertTask.run(
      userIdB,
      "Fix dishwasher leak",
      "Check the door seal and drain hose for blockages.",
      "high",
      "2026-06-29",
      2,
      "personal",
      "medium",
      "todo",
      0,
      "Might need to buy a replacement rubber seal.",
      0.95,
      0.7,
      "Urgent home maintenance to prevent floor damage.",
      "2026-06-29T15:00"
    );

    const tB3 = insertTask.run(
      userIdB,
      "Buy grocery and fresh vegetables",
      "Get organic greens, fruit, milk, and eggs.",
      "low",
      "2026-06-29",
      1,
      "personal",
      "easy",
      "todo",
      0,
      "Stop by Trader Joe's.",
      0.8,
      0.1,
      "Daily routine task, needs to be done tonight.",
      "2026-06-29T18:00"
    );

    // Seed settings for both User A and User B
    const insertSetting = db.prepare("INSERT INTO settings (userId, key, value) VALUES (?, ?, ?)");
    insertSetting.run(userIdA, "work_hours_start", "09:00");
    insertSetting.run(userIdA, "work_hours_end", "18:00");
    insertSetting.run(userIdA, "productivity_goal", "85");
    insertSetting.run(userIdA, "rescue_mode_enabled", "true");
    insertSetting.run(userIdA, "auto_replan_enabled", "true");
    insertSetting.run(userIdA, "user_name", "User A");

    insertSetting.run(userIdB, "work_hours_start", "08:00");
    insertSetting.run(userIdB, "work_hours_end", "17:00");
    insertSetting.run(userIdB, "productivity_goal", "90");
    insertSetting.run(userIdB, "rescue_mode_enabled", "true");
    insertSetting.run(userIdB, "auto_replan_enabled", "true");
    insertSetting.run(userIdB, "user_name", "User B");

    // Seed Initial Chat for both
    const insertChat = db.prepare("INSERT INTO chat_history (userId, sender, message) VALUES (?, ?, ?)");
    insertChat.run(userIdA, "assistant", "Hello! I am your DeadlinePilot AI assistant. I'm ready to help you optimize your schedule, predict deadline risks, and align focus blocks for User A.");
    insertChat.run(userIdB, "assistant", "Hello! I am your DeadlinePilot AI assistant. I'm ready to help you optimize your schedule, predict deadline risks, and align focus blocks for User B.");
  }
}

export { db };
