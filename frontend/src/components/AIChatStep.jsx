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
          <div key={idx} className="flex items-start gap-2 my-1 text-[#1c1917] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#1c1917] mt-1.5 shrink-0" />
            <span>{bulletContent}</span>
          </div>
        );
      }

      const isHeader = line === line.toUpperCase() && line.length > 5 && !line.includes(':');
      if (isHeader) {
        return (
          <h4 key={idx} className="font-black text-xs text-[#1c1917] tracking-wider mt-3 mb-1 uppercase">
            {line}
          </h4>
        );
      }

      return (
        <p key={idx} className="my-1 text-[#1c1917] font-semibold leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 py-2 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1c1917] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1c1917] text-white flex items-center justify-center">
              <Bot className="w-4 h-4 text-emerald-400" />
            </div>
            AI Data Analyst & Explanation Workspace
          </h2>
          <p className="text-xs font-bold text-[#57534e] mt-1">
            Powered by <span className="bg-[#ede9fe] text-[#5b21b6] border border-[#ddd6fe] text-[10px] font-black py-0.5 px-2.5 rounded-full">{geminiModel}</span> with crystal-clear plain reasoning.
          </p>
        </div>
      </div>

      {/* Quick Prompts Chips */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="bg-white border border-[#e8dfd2] text-[#1c1917] font-bold text-xs px-3.5 py-1.5 rounded-full hover:border-black transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Chat Thread Container */}
      <div className="bg-white p-6 rounded-3xl border border-[#e8dfd2] h-[520px] flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="overflow-y-auto space-y-4 pr-2 flex-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 animate-slide-up ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-9 h-9 rounded-2xl bg-[#1c1917] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
              )}

              <div
                className={`p-4 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#1c1917] text-white rounded-br-none shadow-md font-bold'
                    : 'bg-[#fbf8f3] text-[#1c1917] border border-[#e8dfd2] rounded-bl-none shadow-2xs'
                }`}
              >
                {renderFormattedMessage(m.text)}
                {m.source && (
                  <div className="text-[10px] text-[#78716c] mt-2 font-mono flex items-center gap-1.5 pt-2 border-t border-[#e8dfd2] font-bold">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Engine: <strong className="text-[#1c1917]">{m.model_used}</strong></span>
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#ffd2cc] to-[#ded8fd] flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-5 h-5 text-[#1c1917]" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-[#78716c] font-bold animate-pulse">
              <div className="w-9 h-9 rounded-2xl bg-[#f6eee3] flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#1c1917]" />
              </div>
              <div className="bg-[#fbf8f3] px-4 py-3 rounded-2xl border border-[#e8dfd2] flex items-center gap-2">
                <span>AI Analyst is reasoning...</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="mt-4 pt-3 border-t border-[#e8dfd2] flex gap-3"
        >
          <input
            type="text"
            placeholder="Ask AI Analyst: e.g., 'Why this prediction?', 'Explain feature impact'..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="input-field py-3 text-xs flex-1 rounded-full px-5 bg-[#fbf8f3] border border-[#d6cbbe] text-[#1c1917] font-bold"
          />
          <button 
            type="submit" 
            disabled={loading || !inputMessage.trim()} 
            className="btn-primary py-3 px-6 rounded-full cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
