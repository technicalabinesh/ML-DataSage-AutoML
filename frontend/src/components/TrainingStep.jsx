import React, { useState, useEffect } from 'react';
import { Trophy, Cpu, BarChart3, Zap, CheckCircle2, Award, Play, Sparkles, BrainCircuit, FastForward, Sliders } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';

export default function TrainingStep({ sessionId, targetCol, problemType, backendUrl, onTrainSuccess }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // AI Header recommendation state
  const [recommendation, setRecommendation] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [trainMode, setTrainMode] = useState('ai_fast'); // 'ai_fast' or 'full_suite'

  useEffect(() => {
    if (sessionId) {
      fetchRecommendation();
    }
  }, [sessionId, targetCol]);

  useEffect(() => {
    if (sessionId && !results && recommendation) {
      handleTrain(recommendation.selected_models);
    }
  }, [sessionId, targetCol, recommendation]);

  const fetchRecommendation = async () => {
    setRecLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/recommend_models/${sessionId}?target_col=${targetCol || ''}`);
      setRecommendation(res.data);
    } catch (err) {
      console.warn("Failed to fetch AI model recommendation:", err);
    } finally {
      setRecLoading(false);
    }
  };

  const handleTrain = async (overrideModels = null) => {
    setLoading(true);
    setError(null);
    try {
      const modelsToUse = overrideModels !== null 
        ? overrideModels 
        : (trainMode === 'ai_fast' && recommendation?.selected_models ? recommendation.selected_models : null);

      const res = await axios.post(`${backendUrl}/api/train`, {
        session_id: sessionId,
        target_col: targetCol,
        problem_type: problemType,
        selected_models: modelsToUse,
        fast_mode: trainMode === 'ai_fast'
      });
      setResults(res.data);
      onTrainSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Model training failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-2 animate-slide-up">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1c1917] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1c1917] text-white flex items-center justify-center">
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            4 & 5. AI Smart Model Selection & Training
          </h2>
          <p className="text-xs font-bold text-[#57534e] mt-1">
            AI analyzes dataset headers & feature schemas to select top candidate models for ultra-fast training.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleTrain()} 
            disabled={loading} 
            className="btn-primary cursor-pointer shadow-md text-xs py-2.5 px-6 font-extrabold flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Training ML Models...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{trainMode === 'ai_fast' ? '⚡ Train AI Recommended Models' : '🏎️ Train Full AutoML Suite'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 🤖 AI Dataset Header Analysis & Model Selection Card */}
      {recommendation && (
        <div className="bg-white p-6 rounded-3xl border border-[#e8dfd2] shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  AI Dataset Header & Schema Analysis
                </span>
                <span className="text-[10px] uppercase font-black text-[#78716c] bg-[#f6eee3] px-2.5 py-0.5 rounded-full border border-[#e8dfd2]">
                  Engine: {recommendation.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Statistical Schema AI'}
                </span>
              </div>
              <h3 className="text-lg font-black text-[#1c1917] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                AI-Selected Top Models for this Dataset
              </h3>
              <p className="text-xs text-[#44403c] leading-relaxed font-bold">
                {recommendation.reasoning}
              </p>
            </div>

            {/* Strategy Toggle Buttons */}
            <div className="bg-[#f6eee3] p-1.5 rounded-2xl border border-[#e8dfd2] flex items-center gap-1 shrink-0">
              <button
                onClick={() => setTrainMode('ai_fast')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  trainMode === 'ai_fast'
                    ? 'bg-[#1c1917] text-white shadow-xs'
                    : 'text-[#78716c] hover:text-[#1c1917]'
                }`}
              >
                <FastForward className="w-3.5 h-3.5 text-amber-400" />
                ⚡ AI Smart Fast (~1s)
              </button>

              <button
                onClick={() => setTrainMode('full_suite')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  trainMode === 'full_suite'
                    ? 'bg-[#1c1917] text-white shadow-xs'
                    : 'text-[#78716c] hover:text-[#1c1917]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                🏎️ Full Suite (All Models)
              </button>
            </div>
          </div>

          {/* Selected Candidate Tags */}
          <div className="mt-4 pt-4 border-t border-[#e8dfd2] flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black text-[#78716c]">Selected Candidate Models:</span>
            {recommendation.selected_models.map((m, idx) => (
              <span key={idx} className="bg-[#fbf8f3] text-[#1c1917] border border-[#d6cbbe] px-3 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white p-12 text-center space-y-4 rounded-3xl border border-[#e8dfd2] shadow-sm">
          <div className="w-16 h-16 rounded-full border-4 border-[#1c1917] border-t-transparent animate-spin mx-auto" />
          <h3 className="text-2xl font-black text-[#1c1917]">Training Selected ML Candidates...</h3>
          <p className="text-xs text-[#78716c] max-w-md mx-auto font-bold">
            {trainMode === 'ai_fast' 
              ? `Fast training AI-selected models: ${recommendation?.selected_models?.join(', ') || 'Hist Gradient Boosting, Random Forest'}`
              : 'Executing Cross-Validation across all available AutoML candidate models.'
            }
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-sm text-center font-black">
          ⚠️ {error}
        </div>
      )}

      {results && !loading && (
        <div className="space-y-6">
          {/* 🏆 Best Model Showcase Trophy Card */}
          <div className="bg-[#1c1917] text-white p-7 rounded-3xl border border-black relative overflow-hidden shadow-xl animate-slide-up">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-lime-400 to-cyan-400 p-0.5 shadow-xl shrink-0">
                  <div className="w-full h-full bg-[#1c1917] rounded-[22px] flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
                  </div>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-0.5 rounded-full text-[11px] font-black text-amber-300 mb-1.5">
                    <Award className="w-3.5 h-3.5" />
                    Winning AutoML Model Selected
                  </div>
                  <h3 className="text-3xl font-black text-white">
                    {results.best_model_name}
                  </h3>
                  <p className="text-xs text-gray-300 mt-1 font-bold">
                    Ranked #1 on cross-validated performance score for target <code className="text-amber-300 font-mono font-bold">{results.target_col}</code>.
                  </p>
                </div>
              </div>

              {/* Best Metrics Badges */}
              <div className="flex flex-wrap gap-2.5">
                {Object.entries(results.best_metrics).map(([mName, val]) => (
                  <div key={mName} className="bg-white/10 px-4 py-3 rounded-2xl border border-white/10 text-center min-w-[105px]">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{mName.replace('_', ' ')}</div>
                    <div className="text-lg font-black text-amber-300 font-mono mt-0.5">{String(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Model Leaderboard Table & Feature Importances Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Leaderboard */}
            <div className="bg-white p-6 rounded-3xl border border-[#e8dfd2] space-y-4 shadow-sm">
              <h3 className="text-lg font-black text-[#1c1917] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Model Leaderboard & Metric Comparison
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1c1917] text-white uppercase tracking-wider font-black text-[11px]">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Key Metrics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0e8dc] font-mono text-xs">
                    {results.leaderboard.map((m, idx) => (
                      <tr key={idx} className={idx === 0 ? 'bg-[#fefce8] font-bold text-[#854d0e]' : 'hover:bg-[#fbf8f3]'}>
                        <td className="p-3 font-black">
                          {idx === 0 ? <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-black">🏆 #1</span> : `#${idx + 1}`}
                        </td>
                        <td className="p-3 text-[#1c1917] font-sans font-black">{m.model_name}</td>
                        <td className="p-3 text-[#1c1917] font-black">{m.score}</td>
                        <td className="p-3 text-[11px] text-[#57534e] font-semibold">
                          {Object.entries(m.metrics).slice(0, 3).map(([k, v]) => `${k.slice(0, 4)}:${v}`).join(' | ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feature Importance Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-[#e8dfd2] space-y-4 shadow-sm">
              <h3 className="text-lg font-black text-[#1c1917] flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Top Feature Importance Breakdown
              </h3>

              {results.feature_importances && results.feature_importances.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={results.feature_importances}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <XAxis type="number" stroke="#78716c" fontSize={10} />
                      <YAxis dataKey="feature" type="category" stroke="#1c1917" fontSize={11} width={110} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1c1917', borderColor: '#1c1917', color: '#ffffff', borderRadius: '12px' }}
                      />
                      <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                        {results.feature_importances.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#1c1917' : '#f59e0b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-xs text-[#78716c] py-12 text-center font-bold">
                  Feature importances extracted based on tree-based gain and coefficient magnitudes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
