import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Bot, BrainCircuit } from 'lucide-react';
import axios from 'axios';

export default function GeminiAdvisorBanner({ sessionId, step, backendUrl, geminiModel, apiKey }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const fetchInsight = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await axios.post(`${backendUrl}/api/gemini_step_insight`, {
        session_id: sessionId,
        step: step,
        gemini_model: geminiModel || 'gemini-2.5-flash',
        api_key: apiKey || null
      });
      setInsight(res.data);
    } catch (err) {
      console.warn(`Failed to fetch Gemini insight for step ${step}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [sessionId, step]);

  if (!sessionId) return null;

  return (
    <div className="bg-gradient-to-r from-[#fbf8f3] via-[#f7f2ea] to-[#fbf8f3] border border-[#e8dfd2] rounded-2xl p-4 shadow-2xs transition-all animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1c1917] text-amber-400 flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#1c1917] flex items-center gap-2">
              <span>{insight?.title || "Gemini AutoML Intelligence Advisor"}</span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                insight?.source === 'gemini' 
                  ? 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]'
                  : 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'
              }`}>
                {insight?.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Statistical AI Engine'}
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchInsight}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white hover:bg-[#f6eee3] text-[#1c1917] border border-[#e8dfd2] text-xs font-bold cursor-pointer transition-all"
            title="Ask Gemini for fresh advice"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-white hover:bg-[#f6eee3] text-[#1c1917] border border-[#e8dfd2] text-xs font-bold cursor-pointer transition-all"
            title={expanded ? "Collapse AI Advisor" : "Expand AI Advisor"}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#e8dfd2] text-xs text-[#57534e] space-y-1.5">
          {loading ? (
            <div className="flex items-center gap-2 text-xs font-bold text-[#78716c] py-2">
              <div className="w-3.5 h-3.5 border-2 border-[#1c1917] border-t-transparent rounded-full animate-spin" />
              <span>Gemini is analyzing this step...</span>
            </div>
          ) : insight?.bullets && insight.bullets.length > 0 ? (
            <div className="space-y-1">
              {insight.bullets.map((b, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-amber-500 font-black shrink-0 mt-0.5">✦</span>
                  <span className="font-semibold text-[#292524] leading-relaxed">{b}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#78716c] font-bold">
              AI Advisor ready to guide your workflow. Click refresh to query Gemini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
