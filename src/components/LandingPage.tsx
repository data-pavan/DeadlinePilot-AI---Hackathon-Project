import { motion } from "motion/react";
import { 
  Zap, 
  ShieldAlert, 
  Sparkles, 
  CalendarRange, 
  Compass, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  MessageSquareCode,
  CheckCircle,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { useState } from "react";

interface LandingPageProps {
  onLaunch: () => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const features = [
    {
      icon: <Sparkles className="w-6 h-6 text-indigo-600" />,
      title: "Proactive AI Planning",
      desc: "AI doesn't wait for reminders. It actively plans your day so you can execute uninterrupted."
    },
    {
      icon: <Clock className="w-6 h-6 text-amber-500" />,
      title: "Deadline Prediction",
      desc: "Detects missed deadlines before they happen by analyzing workload velocity and task drag."
    },
    {
      icon: <Zap className="w-6 h-6 text-rose-500" />,
      title: "Autonomous Recovery",
      desc: "Automatically reorganizes your schedule when delays happen, keeping priorities locked."
    },
    {
      icon: <Compass className="w-6 h-6 text-emerald-600" />,
      title: "Transparent AI Decisions",
      desc: "Explains every decision in plain English, breaking down risk levels and confidence margins."
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-purple-600" />,
      title: "Real Productivity",
      desc: "Focus on completing actual deep work instead of wasting hours manually managing checklist reminders."
    }
  ];

  const workflowSteps = [
    {
      num: "01",
      title: "Input Tasks",
      desc: "Input your backlog tasks with estimated hours and deadlines. DeadlinePilot instantly analyzes complexity."
    },
    {
      num: "02",
      title: "AI Evaluates Capacity",
      desc: "The AI Assistant calculates your daily bandwidth, active velocity, and predicts exact deadline risks."
    },
    {
      num: "03",
      title: "Autonomous Guidance",
      desc: "If risks are detected, the system proposes defensive schedule adjustments and guides you step-by-step."
    }
  ];

  const faqs = [
    {
      q: "How is DeadlinePilot different from standard reminder apps or Notion?",
      a: "Traditional apps are passive repositories; they wait for you to do the work and remind you when it's too late. DeadlinePilot is an active, autonomous companion. It calculates your actual bandwidth against estimated hours, predicts exactly when you are at risk of a deadline failure, and takes automated replanning steps (like delaying low-priority items) to salvage your target milestones."
    },
    {
      q: "Does the AI actually reschedule my tasks autonomously?",
      a: "Yes. When schedule adjustments are triggered, the AI evaluates your lowest-priority tasks, moves them out of your active daily focus, adds explanatory warning notes, and restructures your calendar to dedicate 100% of your remaining capacity to the critical bottleneck task."
    },
    {
      q: "What is 'Focus Mode' and how does it prevent procrastination?",
      a: "Focus Mode locks down the interface to a single, high-contrast, beautiful fullscreen timer. It removes all dashboard distractions, plays custom ambient sounds or triggers high-motivation coaching messages, and tracks subtask completion milestones in real time."
    },
    {
      q: "Is there local offline support?",
      a: "Absolutely! The system utilizes a full local SQLite database to store all tasks, analytics, settings, and logs, ensuring high-speed operation and high data reliability. If your Gemini API keys are not set up, it falls back to deterministic local scheduling models so you are never locked out."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-x-hidden selection:bg-indigo-600 selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header / Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight text-slate-800">
            DeadlinePilot<span className="text-indigo-600">.AI</span>
          </span>
        </div>
        <div className="hidden md:flex items-center space-x-8 text-sm text-slate-500 font-semibold">
          <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
          <a href="#workflow" className="hover:text-indigo-600 transition-colors">Workflow</a>
          <a href="#testimonials" className="hover:text-indigo-600 transition-colors">Case Studies</a>
          <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
        </div>
        <div>
          <button 
            onClick={onLaunch}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Start Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 pt-16 pb-20 text-center relative z-10 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-8"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Productivity Redefined</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl tracking-tight max-w-5xl leading-[1.1] mb-8 text-slate-900"
        >
          Stop Missing Deadlines.<br />Let AI Plan, Prioritize, and <span className="text-indigo-600">Organize Your Day</span>.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-slate-500 text-base sm:text-lg max-w-3xl leading-relaxed mb-12"
        >
          DeadlinePilot AI is an intelligent productivity companion that proactively analyzes your workload, predicts deadline risks, intelligently prioritizes tasks, and generates beautifully customized daily schedules.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-20"
        >
          <button 
            onClick={onLaunch}
            className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold text-base text-white transition-all shadow-md flex items-center justify-center space-x-3 group cursor-pointer"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <a 
            href="#features" 
            className="px-8 py-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 font-bold text-base text-slate-600 transition-all flex items-center justify-center space-x-2 shadow-sm"
          >
            <span>Explore Features</span>
          </a>
        </motion.div>

        {/* Dynamic App Mockup Preview Card */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="w-full max-w-5xl rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-xl relative"
        >
          <div className="h-10 bg-slate-50 px-6 flex items-center justify-between border-b border-slate-100 text-slate-500 text-xs font-mono font-bold">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <span>deadlinepilot-tasks.db</span>
            <div className="flex items-center space-x-1 text-slate-500">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>ACTIVE STATUS: ON TRACK</span>
            </div>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-white border border-rose-100 relative overflow-hidden shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-wider">Adjustment Suggestion</span>
                <span className="text-xs text-rose-600 font-bold">85% Risk</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Refactor Payment API</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Migrate core payment blocks. Deadline is tonight. 12 hours required.</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold font-mono">
                <span>ADJUSTED CO-TASKS: 2</span>
                <span className="text-indigo-600 font-bold">RESOLVED ✔</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 relative overflow-hidden shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Today's Timeline</span>
                <span className="text-xs text-indigo-600 font-bold">11:00 AM</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Deep Work Block: Core Code</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Scheduled for 120 minutes of uninterrupted concentration. Distractions muted.</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold font-mono">
                <span>DURATION: 2.0h</span>
                <span className="text-emerald-600 font-bold">UP NEXT: BREAK</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col justify-between shadow-sm">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">AI Suggestion</span>
                <p className="text-xs text-indigo-950 italic mt-3 leading-relaxed">"You have 15 estimated hours of tasks but only 7 capacity hours remaining today. I have shifted lower-tier styling items to next Monday to guarantee you finish the Payment Core. Start now."</p>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-100/50 flex items-center justify-between text-[10px] text-indigo-600 font-semibold font-mono">
                <span>OVERLOAD DETECTED</span>
                <span className="text-rose-600 font-bold">AI ADJUSTED</span>
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Feature Highlights Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 relative z-10 border-t border-slate-200">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="font-display font-bold text-3xl sm:text-5xl tracking-tight mb-4 text-slate-900">
            Why DeadlinePilot AI?
          </h2>
          <p className="text-slate-500 text-base sm:text-lg">
            Traditional tools let you overload your list until you sink. DeadlinePilot AI is built with smart, intuitive helpers that actively plan and protect your daily schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {features.map((feat, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -6 }}
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between h-full shadow-sm group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-6 group-hover:scale-105 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="font-display font-bold text-base text-slate-800 mb-3">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-200 bg-white relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center text-left">
          <div className="lg:col-span-1">
            <span className="text-indigo-600 text-xs font-bold uppercase tracking-widest">How It Works</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mt-2 mb-6 text-slate-900 leading-tight">
              An assistant that thinks and adapts with you.
            </h2>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed mb-8">
              Instead of micro-managing dates, enter what you need to achieve and when it is due. The AI Assistant handles schedule alignment, focus blocking, and delay mitigation.
            </p>
            <button 
              onClick={onLaunch}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {workflowSteps.map((step, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between min-h-[220px] shadow-sm">
                <div>
                  <span className="font-display font-black text-4xl text-slate-300 mb-4 block">{step.num}</span>
                  <h3 className="font-bold text-sm sm:text-base text-slate-800 mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Animated Callout Testimonial */}
      <section id="testimonials" className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 text-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl mx-auto">
            <span className="text-indigo-600 text-xs font-bold uppercase tracking-wider block mb-4">CASE STUDY</span>
            <p className="font-display font-medium text-lg sm:text-2xl text-slate-700 leading-relaxed italic mb-8">
              "I had a massive API release and a critical presentation due on the same day. Traditional planners would let me overlap tasks blindly. DeadlinePilot automatically detected a 4-hour deficit, deferred my secondary task, structured 2 deep-focus blocks, and literally saved my week!"
            </p>
            <div className="flex items-center justify-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm border border-indigo-200">
                DK
              </div>
              <div className="text-left">
                <span className="font-bold text-sm text-slate-800 block">Devon K.</span>
                <span className="text-slate-500 text-xs">Lead Full Stack Architect</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <HelpCircle className="w-8 h-8 text-indigo-600 mx-auto mb-4" />
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-800 tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm text-left"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span className="font-bold text-sm sm:text-base text-slate-800">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${activeFaq === i ? "rotate-180 text-indigo-600" : ""}`} />
              </button>
              {activeFaq === i && (
                <div className="px-6 pb-6 text-xs sm:text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-20 relative z-10 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-slate-800 mb-6">Stop Reacting. Start Planning.</h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto mb-10">
            Equip your day with a clear, calm structure designed to reduce stress and help you focus on what really matters.
          </p>
          <button 
            onClick={onLaunch}
            className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold text-sm tracking-wide text-white transition-all shadow-md inline-flex items-center space-x-3 group cursor-pointer"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
          </button>
        </div>
      </section>

      {/* Standard Clean Footer */}
      <footer className="border-t border-slate-200 py-12 relative z-10 bg-slate-50 text-slate-500 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span className="font-display font-extrabold text-slate-700">DeadlinePilot.AI</span>
          </div>
          <div className="flex space-x-6 text-xs text-slate-400 font-semibold">
            <span>&copy; 2026 DeadlinePilot AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
