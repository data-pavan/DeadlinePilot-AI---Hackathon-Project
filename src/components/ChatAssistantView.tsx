import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  Send, 
  RefreshCw, 
  Sparkles, 
  User, 
  Compass, 
  HelpCircle,
  MessageSquare,
  Trash2,
  Paperclip,
  CheckCircle,
  Clock,
  ChevronRight
} from "lucide-react";
import Markdown from "react-markdown";
import { ChatMessage, Task, Settings } from "../types.ts";
import { api } from "../services/api.ts";

interface ChatAssistantViewProps {
  tasks: Task[];
  settings: Settings | null;
  onRefresh: () => void;
}

const CHAT_PROMPTS = [
  "Plan my day",
  "Prioritize my work",
  "Help me finish today's tasks",
  "Create a study schedule"
];

export default function ChatAssistantView({ tasks, settings, onRefresh }: ChatAssistantViewProps) {
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat history
  const loadChatLogs = async () => {
    try {
      const data = await api.getChatLogs();
      setChatLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadChatLogs();
  }, []);

  // Scroll to bottom on logs update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLogs, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    setUserInput("");

    // Append user message optimistically
    const temporaryUserMsg: ChatMessage = {
      id: Date.now(),
      sender: "user",
      message: textToSend,
      created_at: new Date().toISOString()
    };
    setChatLogs(prev => [...prev, temporaryUserMsg]);

    try {
      await api.sendChatMessage(textToSend);
      // Reload logs from backend which includes assistant response
      await loadChatLogs();
      // Refresh tasks in case chat command altered DB task states
      onRefresh();
    } catch (e: any) {
      console.error(e);
      // Append fallback error msg
      const temporaryErr: ChatMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        message: `⚠️ Connection issue: ${e.message || "Unable to reach the server. Please try again."}`,
        created_at: new Date().toISOString()
      };
      setChatLogs(prev => [...prev, temporaryErr]);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSuggestionClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[72vh] text-left"
    >
      {/* Primary chat layout column (3 span) */}
      <div className="lg:col-span-3 rounded-2xl bg-white border border-slate-200 flex flex-col h-full overflow-hidden shadow-sm">
        
        {/* Chat Panel Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h3 className="font-display font-bold text-sm text-slate-800">AI Assistant</h3>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold uppercase tracking-wider">
            Ready
          </span>
        </div>

        {/* Chat History Container */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {initialLoading ? (
            <div className="flex justify-center items-center h-full">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : chatLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-4 py-12">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-display font-bold text-lg text-slate-800">Hi {settings?.user_name || "Pilot"} 👋 How can I help you today?</h4>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                I can help you prioritize your work, plan your day, draft custom schedules, or answer any deadline-related questions.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {chatLogs.map((log) => {
                const isUser = log.sender === "user";
                return (
                  <div 
                    key={log.id} 
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 flex gap-3 ${
                      isUser 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isUser ? 'bg-indigo-700 text-white' : 'bg-indigo-50 border border-indigo-100 text-indigo-600'
                      }`}>
                        {isUser ? <User className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
                      </div>

                      {/* Msg text */}
                      <div className="space-y-1 text-xs sm:text-sm leading-relaxed overflow-x-auto select-text flex-1">
                        <span className={`text-[9px] font-bold block pb-1 border-b mb-1.5 uppercase tracking-wider ${
                          isUser ? 'text-indigo-200 border-indigo-500' : 'text-slate-400 border-slate-200'
                        }`}>
                          {isUser ? "You" : "AI Assistant"}
                        </span>
                        
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{log.message}</p>
                        ) : (
                          <div className="markdown-body prose prose-slate prose-xs text-xs max-w-none text-slate-700">
                            <Markdown>{log.message}</Markdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing loader indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-none p-4 flex items-center space-x-2 text-slate-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex-shrink-0">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Ask anything... (e.g. Plan my day or Can I meet my deadline?)"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage(userInput)}
              className="flex-1 p-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              disabled={loading}
            />
            <button
              onClick={() => handleSendMessage(userInput)}
              disabled={loading || !userInput.trim()}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm shadow-indigo-600/10 flex items-center justify-center disabled:opacity-40 font-bold text-xs uppercase cursor-pointer"
            >
              <Send className="w-4 h-4 mr-1.5" />
              <span>Send</span>
            </button>
          </div>
        </div>

      </div>

      {/* Suggested prompts side panel */}
      <div className="space-y-6 flex flex-col h-full justify-between">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 flex-1 shadow-sm">
          <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="font-display font-semibold text-xs text-slate-700 uppercase tracking-wider">Example Prompts</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Choose any guide prompt below to automate your workspace instantly:
          </p>

          <div className="space-y-2">
            {CHAT_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handlePromptSuggestionClick(prompt)}
                disabled={loading}
                className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 text-xs text-slate-600 transition-all flex items-center justify-between group hover:bg-indigo-50/50 cursor-pointer"
              >
                <span className="truncate pr-2 font-medium">{prompt}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-indigo-600 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>

    </motion.div>
  );
}
