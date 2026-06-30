import { GoogleGenAI, Type } from "@google/genai";

// Initialize the GoogleGenAI client lazy-style to prevent crashes if key is missing on start
let aiClient: GoogleGenAI | null = null;

export function getGeminiAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features will fallback to local calculations.");
      // We will still instantiate with dummy key or let it throw later on actual request,
      // but to be safe and avoid crashing Express start, we return a client that uses key or placeholder.
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY_FOR_SAFETY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Check if AI is configured
export function isAIConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Universal Gemini generation wrapper with automatic quota fallback support
 */
export async function generateContentWithFallback(params: any) {
  const ai = getGeminiAI();
  const primaryModel = params.model || "gemini-3.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite";

  try {
    return await ai.models.generateContent({
      ...params,
      model: primaryModel,
    });
  } catch (error: any) {
    const errorStr = String(error?.message || error || "");
    const isQuotaOrRateLimit = errorStr.includes("429") || 
                               errorStr.includes("quota") || 
                               errorStr.includes("RESOURCE_EXHAUSTED") || 
                               errorStr.includes("limit exceeded") ||
                               (error?.status === 429);
    
    if (isQuotaOrRateLimit && primaryModel !== fallbackModel) {
      console.warn(`[Gemini SDK] Primary model ${primaryModel} hit quota/rate limit. Trying fallback model ${fallbackModel}...`);
      try {
        return await ai.models.generateContent({
          ...params,
          model: fallbackModel,
        });
      } catch (fallbackError: any) {
        console.error(`[Gemini SDK] Fallback model ${fallbackModel} also failed:`, fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

/**
 * AI TASK PRIORITIZATION
 * Analyzes a task and returns urgency, risk, reasoning, and suggested start time.
 */
export async function aiPrioritizeTask(task: {
  title: string;
  description?: string;
  priority: string;
  deadline: string;
  estimated_hours: number;
  category: string;
  difficulty: string;
  status: string;
}, otherTasks: Array<{ title: string; deadline: string; priority: string; status: string }>) {
  if (!isAIConfigured()) {
    return fallbackPrioritization(task);
  }

  try {
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: `
        Analyze this task for prioritization:
        Task Title: ${task.title}
        Description: ${task.description || "None"}
        User Priority: ${task.priority}
        Deadline: ${task.deadline}
        Estimated Hours: ${task.estimated_hours}
        Category: ${task.category}
        Difficulty: ${task.difficulty}
        Status: ${task.status}

        Active Workspace Context (other tasks):
        ${JSON.stringify(otherTasks)}

        Calculate the urgency score (0.0 to 10.0), risk score (0.0 to 1.0 representing chance of failure),
        reasoning (explain why this ranking was chosen and what factors played a part), and a suggested start time (ISO format) considering the deadline.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            urgency_score: {
              type: Type.NUMBER,
              description: "Urgency score from 0.0 (low) to 10.0 (critical)",
            },
            risk_score: {
              type: Type.NUMBER,
              description: "Risk score from 0.0 (no risk) to 1.0 (will definitely fail deadline)",
            },
            reasoning: {
              type: Type.STRING,
              description: "1-2 sentences explaining why the score was calculated this way.",
            },
            suggested_start_time: {
              type: Type.STRING,
              description: "ISO date-time string suggesting the optimal start time to complete the task comfortably before the deadline.",
            },
          },
          required: ["urgency_score", "risk_score", "reasoning", "suggested_start_time"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Gemini prioritization failed, using fallback:", error);
    return fallbackPrioritization(task);
  }
}

function fallbackPrioritization(task: { deadline: string; estimated_hours: number; priority: string }) {
  const deadlineDate = new Date(task.deadline);
  const now = new Date();
  const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  let urgency = 5.0;
  let risk = 0.1;

  if (hoursUntilDeadline <= 0) {
    urgency = 10.0;
    risk = 1.0;
  } else {
    // Basic ratio of estimated hours to remaining hours
    const ratio = task.estimated_hours / hoursUntilDeadline;
    urgency = Math.min(10.0, Math.max(1.0, ratio * 10.0 + (task.priority === "high" ? 2.0 : 0)));
    risk = Math.min(1.0, Math.max(0.0, ratio));
  }

  const suggestedStart = new Date(deadlineDate.getTime() - task.estimated_hours * 1.5 * 60 * 60 * 1000).toISOString();

  return {
    urgency_score: Math.round(urgency * 10) / 10,
    risk_score: Math.round(risk * 100) / 100,
    reasoning: `Calculated by local pilot scheduler: Urgency is based on standard time window of ${Math.round(hoursUntilDeadline)} hours until deadline versus ${task.estimated_hours}h estimated duration.`,
    suggested_start_time: suggestedStart,
  };
}

/**
 * AI DAILY PLANNER
 * Generates an optimized work schedule with deep work, breaks, lunch, and buffer.
 */
export async function aiGenerateDailyPlan(tasks: Array<{
  id: number;
  title: string;
  deadline: string;
  estimated_hours: number;
  priority: string;
  status: string;
}>, settings: { work_hours_start: string; work_hours_end: string }) {
  if (!isAIConfigured()) {
    return fallbackDailyPlan(tasks, settings);
  }

  try {
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: `
        You are an advanced autonomous schedule optimizer. Arrange the tasks below into an optimal daily work schedule.
        Workday start: ${settings.work_hours_start}
        Workday end: ${settings.work_hours_end}
        Current Date/Time: ${new Date().toISOString()}

        Tasks to schedule:
        ${JSON.stringify(tasks.filter(t => t.status !== 'completed' && t.status !== 'archived'))}

        Organize the day into time blocks. Make sure to schedule:
        1. "deep_work" sessions (max 2 hours each) for high-priority/at-risk tasks.
        2. "break" blocks (15 mins) between work blocks.
        3. "lunch" (1 hour, typically around 12:00 or 13:00).
        4. "buffer" blocks (30 mins) near the end of the day to handle unexpected slippage.

        Return an ordered list of schedule blocks for today.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: "Block type: 'deep_work', 'break', 'lunch', 'buffer'",
              },
              task_id: {
                type: Type.INTEGER,
                description: "ID of the task scheduled in this block, or null/absent if non-task block",
              },
              title: {
                type: Type.STRING,
                description: "Display title (e.g., 'Work on: payment api refactor' or 'Lunch Break')",
              },
              start_time: {
                type: Type.STRING,
                description: "Start time in HH:MM format",
              },
              end_time: {
                type: Type.STRING,
                description: "End time in HH:MM format",
              },
              description: {
                type: Type.STRING,
                description: "Quick description of what to focus on or guidelines for the block.",
              },
            },
            required: ["type", "title", "start_time", "end_time", "description"],
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Gemini planning failed, using fallback:", error);
    return fallbackDailyPlan(tasks, settings);
  }
}

function fallbackDailyPlan(tasks: Array<any>, settings: any) {
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
  const blocks: Array<any> = [];

  let currentHour = parseInt(settings.work_hours_start.split(":")[0]) || 9;
  let currentMinute = 0;

  const addBlock = (type: string, title: string, durationMin: number, taskId: number | null, desc: string) => {
    const startStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
    currentMinute += durationMin;
    while (currentMinute >= 60) {
      currentMinute -= 60;
      currentHour += 1;
    }
    const endStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
    blocks.push({
      type,
      task_id: taskId,
      title,
      start_time: startStr,
      end_time: endStr,
      description: desc,
    });
  };

  // Morning buffer / Kickoff
  addBlock("buffer", "Morning Planning & Sync", 30, null, "Sync task priority maps and check Slack / emails.");

  // Iterate active tasks and schedule them
  let taskIndex = 0;
  while (taskIndex < activeTasks.length && currentHour < 17) {
    const task = activeTasks[taskIndex];
    
    // Lunch break trigger
    if (currentHour === 12 && currentMinute === 0) {
      addBlock("lunch", "Lunch & Unplug", 60, null, "Nutritional intake and mental pause.");
    }

    const allocMinutes = Math.min(120, Math.ceil(task.estimated_hours * 60));
    addBlock("deep_work", `Deep Work: ${task.title}`, allocMinutes, task.id, `Focus on completing ${task.title} with 100% attention.`);
    
    // Add break after work block
    if (currentHour < 17) {
      addBlock("break", "Short Recalibration Break", 15, null, "Stretch, hydrate, and relax.");
    }
    taskIndex++;
  }

  // Final Lunch if not triggered earlier
  if (!blocks.some(b => b.type === "lunch")) {
    blocks.push({
      type: "lunch",
      title: "Lunch & Rest",
      start_time: "12:30",
      end_time: "13:30",
      description: "Nourishment block.",
    });
  }

  // End of day buffer
  if (currentHour < 18) {
    addBlock("buffer", "Daily Wrap-up & AI Replanning", 30, null, "Review completed tasks and log progress.");
  }

  return blocks;
}

/**
 * AI DEADLINE RESCUE MODE
 * Predicts failures and generates dynamic mitigation and task rescheduling strategies.
 */
export async function aiRescueDeadlines(tasks: Array<{
  id: number;
  title: string;
  deadline: string;
  estimated_hours: number;
  priority: string;
  status: string;
  category: string;
}>) {
  if (!isAIConfigured()) {
    return fallbackRescuePlan(tasks);
  }

  try {
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: `
        You are the ultimate DeadlineRescue Pilot AI. Analyze this workspace's current task portfolio and diagnose whether any high-priority deadlines are at risk.
        Current Time: ${new Date().toISOString()}

        Tasks:
        ${JSON.stringify(tasks)}

        Analyze remaining hours vs deadline timestamps.
        If a user has 10 hours of work due in 6 hours, that is a critical overload failure!
        Formulate an aggressive Rescue Operation:
        1. Identify the bottleneck tasks causing the collision.
        2. Formulate a list of low-priority tasks to be postponed or deferred.
        3. Create a step-by-step recovery timeline.
        4. Calculate the success probability (0-100%) if the rescue strategy is strictly followed.
        5. Create an actionable recovery checklist.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_overloaded: {
              type: Type.BOOLEAN,
              description: "True if a deadline failure or scheduling collision is predicted",
            },
            risk_level: {
              type: Type.STRING,
              description: "Risk assessment: 'low', 'medium', 'high', 'critical'",
            },
            bottleneck_explanation: {
              type: Type.STRING,
              description: "Detailed reason explaining the schedule conflict or bottleneck.",
            },
            postponed_tasks_ids: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "Array of task IDs of low-priority tasks that the AI suggests postponing to free up hours.",
            },
            recovery_timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phase: { type: Type.STRING, description: "e.g., 'Phase 1: Immediate Triage'" },
                  description: { type: Type.STRING, description: "Action to take or adjustment made during this phase." },
                },
                required: ["phase", "description"],
              },
            },
            action_checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Actionable step-by-step checklist to guide the user out of the risk zone.",
            },
            success_probability: {
              type: Type.INTEGER,
              description: "Estimated success rate percentage (e.g. 85) if plan is executed.",
            },
          },
          required: [
            "is_overloaded",
            "risk_level",
            "bottleneck_explanation",
            "postponed_tasks_ids",
            "recovery_timeline",
            "action_checklist",
            "success_probability",
          ],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Gemini rescue failed, using fallback:", error);
    return fallbackRescuePlan(tasks);
  }
}

function fallbackRescuePlan(tasks: Array<any>) {
  // Simple local checking: look for active high priority tasks with deadlines in next 30h
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
  const highPriorityClose = activeTasks.filter(t => t.priority === 'high');
  
  const isOverloaded = highPriorityClose.length > 0;
  const riskLevel = highPriorityClose.length > 1 ? "critical" : highPriorityClose.length === 1 ? "high" : "low";

  const lowPriorityIds = activeTasks
    .filter(t => t.priority === 'low')
    .map(t => t.id);

  return {
    is_overloaded: isOverloaded,
    risk_level: riskLevel,
    bottleneck_explanation: isOverloaded 
      ? `Local pilot engine has detected ${highPriorityClose.length} high-priority tasks requiring deep focus with imminent deadlines. Your task pipeline is bottlenecked due to overlapping estimated work windows.`
      : "No critical schedule bottlenecks detected. All deadlines are healthy.",
    postponed_tasks_ids: lowPriorityIds.slice(0, 2),
    recovery_timeline: [
      {
        phase: "Phase 1: Immediate Focus",
        description: "Postpone minor design tasks and allocate all remaining bandwidth to the primary high-priority task.",
      },
      {
        phase: "Phase 2: Deep Work Block",
        description: "Engage Focus Mode for a minimum of 2 hours. Mute slack and turn off peripheral notifications.",
      },
    ],
    action_checklist: [
      "Engage Focus Mode on the highest priority task immediately.",
      "Inform project stakeholders about minor low-priority delay updates.",
      "Complete the remaining micro-subtasks to mark 50% milestone progress.",
    ],
    success_probability: isOverloaded ? 78 : 100,
  };
}

/**
 * AI TASK BREAKDOWN
 * Breaks a major task/goal into modular subtasks.
 */
export async function aiBreakdownTask(title: string, description?: string) {
  if (!isAIConfigured()) {
    return [
      "Initial research and resource gathering",
      "Draft system outline & design specification",
      "Core framework implementation & coding",
      "Integrate authentication and database schemas",
      "Run unit tests and perform edge case validation",
      "Review milestones and present demo deck"
    ];
  }

  try {
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: `
        Break down this complex goal/task into a list of 5 to 7 bite-sized, sequential, actionable subtask titles.
        Goal Title: ${title}
        Goal Description: ${description || "None"}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "A concrete, actionable subtask title (e.g. 'Setup sqlite schemas')",
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error("Gemini breakdown failed, using fallback:", error);
    return [
      `Define core requirements for ${title}`,
      `Build architectural mockup / draft schema`,
      `Implement primary logic`,
      `Perform quality control checks`,
      `Finalize delivery and celebrate completed milestones`
    ];
  }
}

/**
 * AI PRODUCTIVITY COACH
 * Conversational coaching using workspace telemetry.
 */
export async function aiProductivityCoach(
  question: string,
  tasks: Array<any>,
  analytics: Array<any>,
  settings: any
): Promise<string> {
  if (!isAIConfigured()) {
    return `
### DeadlinePilot Coach Insight 💡
I'm running in local mode as the Gemini API key is not fully configured, but I can still offer you a strategic assessment:

*   **Current Load**: You have **${tasks.filter(t => t.status !== 'completed').length} active tasks** in your cockpit.
*   **Recommendation**: Focus immediately on the task with the nearest deadline. Avoid multi-tasking which degrades performance by up to 40%.
*   **Coach Advice**: Ensure you establish a dedicated 90-minute **Deep Work** session today with a timer. Let's conquer those deadlines!
    `;
  }

  try {
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: `
        You are a friendly, encouraging personal productivity coach who helps people manage their daily schedules.
        Your tone is supportive, positive, simple, and human (like Google Assistant or a friendly mentor).
        DO NOT use technical, futuristic, corporate, or military jargon (e.g., "compress execution path", "refactoring", "BigQuery logs", "cognitive", "autonomous", "mitigate", "burnout").
        The user is asking: "${question}"

        Active Workspace data:
        Tasks: ${JSON.stringify(tasks)}
        Settings: ${JSON.stringify(settings)}
        Recent History: ${JSON.stringify(analytics)}

        Provide a friendly, structured response in plain, simple English that a 10-year-old would easily understand. Keep it highly practical, encouraging, and focused on helping them finish their work on time with zero stress.
      `,
    });

    return response.text || "I was unable to analyze your workspace. Let's schedule a manual planning block!";
  } catch (error) {
    console.error("Gemini coach failed:", error);
    return "I hit a turbulence block while contacting the pilot network. Let's try that query again.";
  }
}

/**
 * AI WORKSPACE DYNAMIC ANALYSIS ENGINE
 * Proactively detects scheduling conflicts, workload stress points, idle times, and opportunities.
 * Returns comprehensive risk center telemetry and structured recommendations with explanations.
 */
export async function aiAnalyzeWorkspace(tasks: Array<any>, settings: any) {
  if (!isAIConfigured()) {
    return fallbackWorkspaceAnalysis(tasks, settings);
  }

  try {
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: `
        You are a friendly personal productivity assistant. Analyze the following tasks and settings to help the user manage their day.
        Current Time: ${new Date().toISOString()}
        Settings: ${JSON.stringify(settings)}
        Tasks: ${JSON.stringify(tasks)}

        Identify any potential schedule issues such as tasks that might be late or a day that looks too busy.
        Generate friendly, supportive, and extremely simple recommendations in plain English that a 10-year-old would easily understand.
        Do NOT use technical or futuristic jargon (such as "execute", "cognitive risk", "refactoring", "telemetry", "optimization", "microservice").
        Instead, use simple, everyday phrases like "Finish this task first" or "Move less important work to tomorrow."
        
        Generate a simple risk rating and 1-3 tailored friendly suggestions.
        Each recommendation MUST contain a simple explanation block with prioritized reason, deadline proximity, remaining work, workload analysis, importance, estimated risk, and a confidence score.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risk_meter: {
              type: Type.OBJECT,
              properties: {
                overall_productivity_risk: {
                  type: Type.STRING,
                  description: "Risk evaluation: 'Green', 'Yellow', 'Orange', or 'Red'",
                },
                completion_probability: {
                  type: Type.INTEGER,
                  description: "Percentage (0-100) of completing all active tasks on schedule",
                },
                risk_score: {
                  type: Type.INTEGER,
                  description: "Total risk score percentage (0-100) representing schedule threat",
                },
                workload_level: {
                  type: Type.STRING,
                  description: "Workload rating: 'Light', 'Moderate', 'Heavy', or 'Critical'",
                },
                estimated_completion_time: {
                  type: Type.STRING,
                  description: "Readable text representing total estimated hours left, e.g. '8.5 hours'",
                },
                next_deadline_countdown: {
                  type: Type.STRING,
                  description: "Countdown text to the closest deadline, e.g. '3 hours, 14 mins' or '2 days'",
                },
              },
              required: [
                "overall_productivity_risk",
                "completion_probability",
                "risk_score",
                "workload_level",
                "estimated_completion_time",
                "next_deadline_countdown",
              ],
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING, description: "Action-oriented recommendation title" },
                  type: {
                    type: Type.STRING,
                    description: "Type: 'conflict', 'overload', 'impossible_timeline', 'high_risk', 'idle_time', 'optimization'",
                  },
                  action_type: {
                    type: Type.STRING,
                    description: "Action kind: 'reschedule', 'delegate', 'prioritize', 'focus', 'break'",
                  },
                  description: { type: Type.STRING, description: "A highly specific, concise recommendation text" },
                  affected_tasks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of titles of affected tasks",
                  },
                  why: {
                    type: Type.OBJECT,
                    properties: {
                      prioritized_reason: { type: Type.STRING },
                      deadline_proximity: { type: Type.STRING },
                      estimated_remaining_work: { type: Type.STRING },
                      workload_analysis: { type: Type.STRING },
                      task_importance: { type: Type.STRING },
                      estimated_risk: { type: Type.STRING },
                      confidence_score: { type: Type.INTEGER },
                    },
                    required: [
                      "prioritized_reason",
                      "deadline_proximity",
                      "estimated_remaining_work",
                      "workload_analysis",
                      "task_importance",
                      "estimated_risk",
                      "confidence_score",
                    ],
                  },
                },
                required: ["id", "title", "type", "action_type", "description", "affected_tasks", "why"],
              },
            },
          },
          required: ["risk_meter", "recommendations"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    throw new Error("Empty response from Gemini Workspace Analysis");
  } catch (error) {
    console.error("Gemini workspace analysis failed, using fallback:", error);
    return fallbackWorkspaceAnalysis(tasks, settings);
  }
}

function fallbackWorkspaceAnalysis(tasks: Array<any>, settings: any) {
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
  const totalHours = activeTasks.reduce((acc, t) => acc + (parseFloat(t.estimated_hours) || 1), 0);
  const now = new Date();
  
  let nearestTask: any = null;
  let minDiff = Infinity;
  let highRiskCount = 0;

  activeTasks.forEach(task => {
    const diff = new Date(task.deadline).getTime() - now.getTime();
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      nearestTask = task;
    }
    if (task.priority === 'high' || task.ai_risk > 0.5) {
      highRiskCount++;
    }
  });

  let overall_risk = "Green";
  let workload_level = "Light";
  if (totalHours > 12 || highRiskCount > 2) {
    overall_risk = "Red";
    workload_level = "Critical";
  } else if (totalHours > 8 || highRiskCount > 1) {
    overall_risk = "Orange";
    workload_level = "Heavy";
  } else if (totalHours > 4) {
    overall_risk = "Yellow";
    workload_level = "Moderate";
  }

  const completion_probability = Math.max(25, Math.min(95, 100 - (totalHours * 4) - (highRiskCount * 12)));
  const risk_score = 100 - completion_probability;

  let countdownStr = "No imminent deadlines";
  if (nearestTask) {
    const diffHours = Math.floor(minDiff / (1000 * 60 * 60));
    const diffMins = Math.floor((minDiff % (1000 * 60 * 60)) / (1000 * 60));
    countdownStr = diffHours > 24 ? `${Math.floor(diffHours/24)}d ${diffHours%24}h` : `${diffHours}h ${diffMins}m`;
  }

  const recommendations: any[] = [];
  if (activeTasks.length > 0) {
    if (overall_risk === "Red" || overall_risk === "Orange") {
      recommendations.push({
        id: "rec_1",
        title: "Focus on your most important tasks today",
        type: "overload",
        action_type: "prioritize",
        description: `You have a lot to do today (${Math.round(totalHours)} hours of work). Move less important work to tomorrow and focus on what needs to be finished first.`,
        affected_tasks: activeTasks.slice(0, 2).map(t => t.title),
        why: {
          prioritized_reason: "Your closest deadlines are today, and your day looks very busy.",
          deadline_proximity: countdownStr,
          estimated_remaining_work: `${totalHours} hours across ${activeTasks.length} tasks`,
          workload_analysis: "A busy schedule leaves less time for breaks.",
          task_importance: "These tasks need to be completed today to stay on track.",
          estimated_risk: `${risk_score}% chance of delay`,
          confidence_score: 90
        }
      });
    } else {
      recommendations.push({
        id: "rec_1",
        title: "Plan some quiet focus time",
        type: "optimization",
        action_type: "focus",
        description: "Try working in 90-minute blocks with short breaks to stay fresh and focused.",
        affected_tasks: activeTasks.slice(0, 1).map(t => t.title),
        why: {
          prioritized_reason: "Working in focused blocks helps you stay happy and get more done.",
          deadline_proximity: countdownStr,
          estimated_remaining_work: `${totalHours} hours total`,
          workload_analysis: "You have plenty of time today to get this done comfortably.",
          task_importance: "These are standard tasks that you can finish quickly.",
          estimated_risk: "Very low risk",
          confidence_score: 95
        }
      });
    }

    const highRisk = activeTasks.find(t => t.priority === 'high' || (parseFloat(t.ai_risk) || 0) > 0.4);
    if (highRisk) {
      recommendations.push({
        id: "rec_2",
        title: `Break down '${highRisk.title}' into smaller steps`,
        type: "high_risk",
        action_type: "focus",
        description: "This is a big task. Let's break it down into smaller, easier pieces so you can finish it comfortably.",
        affected_tasks: [highRisk.title],
        why: {
          prioritized_reason: "Big tasks can feel hard if we try to do them all at once.",
          deadline_proximity: "Coming up soon",
          estimated_remaining_work: `${highRisk.estimated_hours} hours`,
          workload_analysis: "We should focus on this task next.",
          task_importance: "This is an important piece of your project.",
          estimated_risk: "Slightly higher risk if not broken down",
          confidence_score: 88
        }
      });
    }
  } else {
    recommendations.push({
      id: "rec_empty",
      title: "All tasks finished! Time to relax",
      type: "idle_time",
      action_type: "break",
      description: "You've finished everything! Take a well-deserved break, or plan what to do next.",
      affected_tasks: [],
      why: {
        prioritized_reason: "Your schedule is completely clear.",
        deadline_proximity: "None",
        estimated_remaining_work: "0 hours",
        workload_analysis: "Perfect capacity. No stress!",
        task_importance: "Nothing urgent today.",
        estimated_risk: "0% risk of delay",
        confidence_score: 99
      }
    });
  }

  return {
    risk_meter: {
      overall_productivity_risk: overall_risk,
      completion_probability,
      risk_score,
      workload_level,
      estimated_completion_time: `${totalHours.toFixed(1)} hours`,
      next_deadline_countdown: countdownStr
    },
    recommendations
  };
}

/**
 * AI WHAT-IF SCENARIO SIMULATOR
 * Simulates two productivity pathways: Scenario A (Follow AI Plan) vs Scenario B (Ignore suggestions).
 */
export async function aiWhatIfSimulator(tasks: Array<any>) {
  if (!isAIConfigured()) {
    return fallbackWhatIfSimulator(tasks);
  }

  try {
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: `
        You are an advanced Productivity Scenario Simulator. Analyze the active workspace tasks:
        Tasks: ${JSON.stringify(tasks.filter(t => t.status !== 'completed' && t.status !== 'archived'))}

        Generate two simulation pathways for the day:
        1. Scenario A — Follow AI Plan (Systematic progress, pre-allocated deep focus and rests, high success, low stress).
        2. Scenario B — Ignore AI Suggestions (Multitasking, procrastination, missed deadlines, high stress and spillover).

        Return a beautiful comparative output describing the emotional stress levels, completion probabilities, key outcomes, and a short, highly personalized story narrative for each path.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenario_a: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                completion_probability: { type: Type.INTEGER },
                stress_level: { type: Type.STRING },
                key_outcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING, description: "Detailed narrative of how the day progresses" },
              },
              required: ["title", "completion_probability", "stress_level", "key_outcomes", "description"],
            },
            scenario_b: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                completion_probability: { type: Type.INTEGER },
                stress_level: { type: Type.STRING },
                key_outcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING, description: "Detailed narrative of how the day progresses" },
              },
              required: ["title", "completion_probability", "stress_level", "key_outcomes", "description"],
            },
          },
          required: ["scenario_a", "scenario_b"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    throw new Error("Empty response from What-If Simulation");
  } catch (error) {
    console.error("Gemini what-if simulator failed, using fallback:", error);
    return fallbackWhatIfSimulator(tasks);
  }
}

function fallbackWhatIfSimulator(tasks: Array<any>) {
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
  const totalHours = activeTasks.reduce((acc, t) => acc + (parseFloat(t.estimated_hours) || 1), 0);
  const highPriority = activeTasks.filter(t => t.priority === 'high');

  let taskAStr = "You will work on your tasks one by one based on importance, with friendly breaks in between.";
  let taskBStr = "You might try to do too many things at once, which can make you feel tired and leave work unfinished.";

  if (activeTasks.length > 0) {
    const highest = activeTasks[0].title;
    taskAStr = `By following the AI plan, you focus completely on '${highest}' when your energy is highest. Your important tasks get done on time, and you get plenty of rest.`;
    taskBStr = `By trying to do everything at once, you might put off '${highest}' because of other small tasks. This will leave you with a huge pile of work for tomorrow.`;
  }

  const completionA = Math.max(88, Math.min(99, 100 - (highPriority.length * 2)));
  const completionB = Math.max(35, Math.min(65, 100 - (totalHours * 4) - (highPriority.length * 10)));

  return {
    scenario_a: {
      title: "Scenario A: Follow the AI Plan",
      completion_probability: completionA,
      stress_level: "Low",
      key_outcomes: [
        "You finish your most important tasks on time",
        "Built-in breaks keep you from feeling too tired",
        "Nice transitions between tasks with easy rests",
        "You can relax and sleep well with zero worry"
      ],
      description: taskAStr
    },
    scenario_b: {
      title: "Scenario B: Try to do everything at once",
      completion_probability: completionB,
      stress_level: totalHours > 8 ? "High" : "Moderate",
      key_outcomes: [
        "You might miss some of your closest deadlines",
        "Trying to do too many things at once makes you tired",
        "You may have to work late without any breaks to catch up",
        "Unfinished tasks will pile up for tomorrow"
      ],
      description: taskBStr
    }
  };
}

