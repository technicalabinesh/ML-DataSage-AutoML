import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, CheckCircle2, MessageSquare, Zap } from 'lucide-react';
import axios from 'axios';

export default function AIChatStep({
  sessionId,
  backendUrl,
  geminiModel,
  apiKey,
  lastPrediction
}) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your AutoML AI Data Analyst. Ask me anything about your dataset, ETL cleaning, model performance, or why a specific prediction was generated!"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const quickPrompts = [
    "Why was this prediction made?",
    "Which features affect outcomes most?",
    "Summarize ETL cleaning & data health",
    "How to improve model accuracy?"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const cleanText = (rawText) => {
    if (!rawText) return "";
    return rawText
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove ** bold markers
      .replace(/\*(.*?)\*/g, '$1')     // remove * italic markers
      .replace(/#{1,6}\s*/g, '')      // remove ### headers
      .replace(/`([^`]+)`/g, '$1');   // remove inline code ticks
  };

  const handleSend = async (textToSend = null) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg = { sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const res = await axios.post(`${backendUrl}/api/chat`, {
        session_id: sessionId,
        message: text,
        gemini_model: geminiModel,
        api_key: apiKey
      });

      const cleanedResponse = cleanText(res.data.response);

      const aiMsg = {
        sender: 'ai',
        text: cleanedResponse,
        source: res.data.source,
        model_used: res.data.model_used
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: "Error querying AI Analyst. Please verify backend API status." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedMessage = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        const bulletContent = trimmed.replace(/^[•\-]\s*/, '');
        return (
          <div key={idx} className="flex items-start gap-2 my-1 text-gray-200">
            <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
            <span>{bulletContent}</span>
          </div>
        );
      }

      const isHeader = line === line.toUpperCase() && line.length > 5 && !line.includes(':');
      if (isHeader) {
        return (
          <h4 key={idx} className="font-extrabold text-sm text-lime-400 tracking-wide mt-3 mb-1 uppercase">
            {line}
          </h4>
        );
      }

      return (
        <p key={idx} className="my-1 text-gray-200 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 py-4 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-cyan-400 animate-float" />
            AI Data Analyst & Explanation Workspace
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Powered by <span className="pill-badge pill-purple text-[10px] py-0.5 px-2.5">{geminiModel}</span> with zero raw markdown symbols.
          </p>
        </div>
      </div>

      {/* Quick Prompts Chips */}
      <div className="flex flex-wrap gap-2.5">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="pill-badge bg-slate-900 border border-white/15 text-indigo-300 hover:border-indigo-400 hover:text-white transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Chat Thread Container */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 h-[520px] flex flex-col justify-between shadow-2xl relative overflow-hidden">
        <div className="overflow-y-auto space-y-4 pr-2 scrollbar-none flex-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 animate-slide-up ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-0.5 shrink-0 shadow-lg shadow-cyan-500/20">
                  <div className="w-full h-full bg-[#0d1322] rounded-[14px] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-cyan-300" />
                  </div>
                </div>
              )}

              <div
                className={`p-4 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-xl shadow-indigo-600/30 font-medium'
                    : 'bg-slate-900/90 text-gray-100 border border-white/15 rounded-bl-none shadow-md'
                }`}
              >
                {renderFormattedMessage(m.text)}
                {m.source && (
                  <div className="text-[10px] text-gray-400 mt-2 font-mono flex items-center gap-1.5 pt-2 border-t border-white/10">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Engine: <strong className="text-cyan-300">{m.model_used}</strong></span>
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shrink-0 shadow-lg shadow-purple-500/20">
                  <div className="w-full h-full bg-[#0d1322] rounded-[14px] flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-300" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-gray-300 animate-pulse">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="bg-slate-900/90 px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-2">
                <span>AI Analyst is reasoning...</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full dot-1" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full dot-2" />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full dot-3" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="mt-4 pt-3 border-t border-white/10 flex gap-3"
        >
          <input
            type="text"
            placeholder="Ask AI Analyst: e.g., 'Why this prediction?', 'Explain feature impact'..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="input-field py-3 text-xs flex-1 rounded-full px-5"
          />
          <button type="submit" disabled={loading || !inputMessage.trim()} className="btn-primary py-3 px-6 rounded-full">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
