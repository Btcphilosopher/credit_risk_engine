import { useState, useRef, useEffect } from 'react';
import { Send, Terminal, ShieldPlus, Bot, Sparkles, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export default function RiskCopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m0",
      sender: "bot",
      text: "Greetings. I am your specialized Gemini Credit Risk Copilot. I can assist with Basel III regulations, IFRS 9 / CECL calculations, log-odds scorecard scoring, Gaussian Copulas and credit pricing models. \n\nSelect a preset query below or input your quantitative risk inquiry directly.",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const presets = [
    { label: "IFRS 9 vs. CECL", query: "Explain the visual differences between IFRS 9 (3-Stage impairment framework) and US CECL standards in provisioning expected losses." },
    { label: "Vasicek Correlation", query: "Explain what role the asset correlation (rho) parameter plays in the Vasicek / Basel Single-Risk-Factor framework, and how it handles tail density skews." },
    { label: "Scorecard Calibration", query: "Show me the detailed mathematical steps to calibrate raw Probabilities of Default (PD) into FICO credit scores from 300 to 850 using raw odds and PDO." },
    { label: "R Gini Metric Code", query: "Provide me an R script using ggplot2 and the Hmisc or pROC library to compute and plot the ROC curve, Gini coefficient, and cumulative gains charts." }
  ];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: "u-" + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });
      const data = await response.json();
      
      const botMsg: Message = {
        id: "b-" + Date.now(),
        sender: 'bot',
        text: data.text || "Failed to gather advice.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      const botErrorMsg: Message = {
        id: "err-" + Date.now(),
        sender: 'bot',
        text: "Apologies. I experienced an error establishing advice pipelines with the risk engine database server.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botErrorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0f172a]/40 backdrop-blur-md rounded-xl border border-slate-800/80 overflow-hidden h-[600px] shadow-none" id="gemini-risk-advisor">
      {/* Preset Queries sidebar */}
      <div className="lg:col-span-4 bg-[#0a0f1d]/60 border-r border-slate-800/80 p-5 overflow-y-auto flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Bot size={18} className="text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">AI Adviser Presets</span>
          </div>

          <div className="space-y-2">
            {presets.map((p, idx) => (
              <button
                id={`preset-btn-${idx}`}
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                className="w-full text-left p-3 rounded-lg border border-slate-850 bg-[#0b0f19]/70 hover:border-indigo-500 hover:bg-slate-950/40 hover:shadow-indigo-500/10 transition duration-200 text-xs block group"
              >
                <div className="font-extrabold text-slate-200 group-hover:text-slate-100 flex items-center justify-between">
                  <span>{p.label}</span>
                  <Sparkles size={11} className="text-slate-500 group-hover:text-indigo-400 transition animate-pulse" />
                </div>
                <p className="text-slate-400 leading-relaxed mt-1 line-clamp-2">{p.query}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-3 mt-4 flex items-start space-x-2 text-[11px] text-indigo-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>This advisory console is powered by server-side Gemini Models for strict credential privacy and regulatory reasoning accuracy.</span>
        </div>
      </div>

      {/* Chat workspace console */}
      <div className="lg:col-span-8 flex flex-col justify-between h-full overflow-hidden bg-[#070b14]/40">
        {/* Chat top header */}
        <div className="bg-slate-950/40 p-4 border-b border-slate-800/80 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center space-x-1.5 font-sans">
              <Sparkles size={15} className="text-indigo-400 animate-pulse" />
              <span>AI Credit Risk Copilot Workspace</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Server-side Quantitative Expert advice</span>
          </div>
          <span className="text-[10px] font-bold bg-[#0b0f19] border border-slate-800 text-slate-400 rounded px-2 py-0.5">Gemini Flash</span>
        </div>

        {/* Chat log messages */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[440px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap ${
                m.sender === 'user'
                  ? 'bg-indigo-600 border-indigo-750 text-white rounded-br-none shadow-xs'
                  : 'bg-[#0b0f19]/80 border-slate-800 text-slate-150 rounded-bl-none shadow-xs'
              }`}>
                {m.text}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 font-mono">
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start mr-auto max-w-[80%]">
              <div className="p-3.5 bg-[#0b0f19]/80 border border-slate-800 rounded-xl text-xs rounded-bl-none text-slate-400 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-150"></span>
                <span>Copilot is formulating advice...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef}></div>
        </div>

        {/* Chat text input box */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center space-x-3 shrink-0">
          <input
            id="chat-input-field"
            type="text"
            value={inputMessage}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(inputMessage); }}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            placeholder="Interrogate underwriting cycles, portfolio, and credit formulas..."
            className="flex-1 px-3 py-2 border border-slate-805 rounded-lg text-xs bg-slate-950 focus:border-indigo-500 focus:outline-hidden text-slate-100"
          />
          <button
            id="chat-send-btn"
            onClick={() => handleSendMessage(inputMessage)}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition shrink-0 cursor-pointer shadow-md shadow-indigo-500/10"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
