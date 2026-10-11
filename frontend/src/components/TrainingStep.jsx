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
    <div className="space-y-6 py-4 animate-slide-up">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-indigo-400" />
            4 & 5. AI Smart Model Selection & Training
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            AI analyzes dataset headers & feature schemas to select top candidate models for ultra-fast training.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleTrain()} 
            disabled={loading} 
            className="btn-primary"
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
        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-900/90 via-indigo-950/30 to-slate-900/90 relative overflow-hidden shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="pill-badge pill-cyan text-[11px]">
                  <BrainCircuit className="w-3.5 h-3.5 text-cyan-300" />
                  AI Dataset Header & Schema Analysis
                </span>
                <span className="text-[10px] uppercase font-bold text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                  Engine: {recommendation.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Statistical Schema AI'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                AI-Selected Top Models for this Dataset
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                {recommendation.reasoning}
              </p>
            </div>

            {/* Strategy Toggle Buttons */}
            <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 flex items-center gap-1 shrink-0">
              <button
                onClick={() => setTrainMode('ai_fast')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  trainMode === 'ai_fast'
                    ? 'bg-gradient-to-r from-lime-500 to-emerald-500 text-slate-950 shadow-lg font-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FastForward className="w-3.5 h-3.5" />
                ⚡ AI Smart Fast (~1s)
              </button>

              <button
                onClick={() => setTrainMode('full_suite')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  trainMode === 'full_suite'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg font-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                🏎️ Full Suite (All Models)
              </button>
            </div>
          </div>

          {/* Selected Candidate Tags */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400">Selected Candidate Models:</span>
            {recommendation.selected_models.map((m, idx) => (
              <span key={idx} className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-lime-400" />
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="glass-panel p-12 text-center space-y-4 rounded-3xl border-indigo-500/30 animate-pulse">
          <div className="w-20 h-20 rounded-full border-4 border-lime-400 border-t-transparent animate-spin mx-auto" />
          <h3 className="text-2xl font-extrabold text-white">Training Selected ML Candidates...</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto font-medium">
            {trainMode === 'ai_fast' 
              ? `Fast training AI-selected models: ${recommendation?.selected_models?.join(', ') || 'Hist Gradient Boosting, Random Forest'}`
              : 'Executing Cross-Validation across all available AutoML candidate models.'
            }
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm text-center font-bold">
          ⚠️ {error}
        </div>
      )}

      {results && !loading && (
        <div className="space-y-6">
          {/* 🏆 Best Model Showcase Trophy Card */}
          <div className="glass-panel p-7 rounded-3xl border-2 border-lime-400/50 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 relative overflow-hidden shadow-2xl animate-slide-up">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-lime-400 to-cyan-400 p-0.5 shadow-2xl shadow-lime-400/20 shrink-0">
                  <div className="w-full h-full bg-[#090d16] rounded-[22px] flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
                  </div>
                </div>
                <div>
                  <div className="pill-badge pill-lime text-[11px] mb-1.5">
                    <Award className="w-3.5 h-3.5" />
                    Winning AutoML Model Selected
                  </div>
                  <h3 className="text-3xl font-black text-white">
                    {results.best_model_name}
                  </h3>
                  <p className="text-xs text-gray-300 mt-1 font-medium">
                    Ranked #1 on cross-validated performance score for target <code className="text-lime-300 font-mono font-bold">{results.target_col}</code>.
                  </p>
                </div>
              </div>

              {/* Best Metrics Badges */}
              <div className="flex flex-wrap gap-3">
                {Object.entries(results.best_metrics).map(([mName, val]) => (
                  <div key={mName} className="bg-slate-950/90 px-4 py-3 rounded-2xl border border-white/15 text-center min-w-[110px] shadow-lg">
                    <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{mName.replace('_', ' ')}</div>
                    <div className="text-lg font-black text-lime-300 font-mono mt-0.5">{String(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Model Leaderboard Table & Feature Importances Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Leaderboard */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Model Leaderboard & Metric Comparison
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 text-gray-400 border-b border-white/10 uppercase tracking-wider font-extrabold">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Primary Metric</th>
                      <th className="p-3">Key Metrics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {results.leaderboard.map((m, idx) => (
                      <tr key={idx} className={idx === 0 ? 'bg-lime-400/10 font-bold text-lime-300' : 'hover:bg-white/[0.02]'}>
                        <td className="p-3">
                          {idx === 0 ? <span className="pill-badge pill-amber text-[10px] py-0 px-2">🏆 #1</span> : `#${idx + 1}`}
                        </td>
                        <td className="p-3 text-white font-sans font-bold">{m.model_name}</td>
                        <td className="p-3 text-cyan-300 font-bold">{m.score}</td>
                        <td className="p-3 text-[11px] text-gray-400">
                          {Object.entries(m.metrics).slice(0, 3).map(([k, v]) => `${k.slice(0, 4)}:${v}`).join(' | ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feature Importance Breakdown */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-lime-400" />
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
                      <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                      <YAxis dataKey="feature" type="category" stroke="#d1d5db" fontSize={11} width={110} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f3f4f6', borderRadius: '12px' }}
                      />
                      <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                        {results.feature_importances.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ccff00' : '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-xs text-gray-400 py-12 text-center">
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
