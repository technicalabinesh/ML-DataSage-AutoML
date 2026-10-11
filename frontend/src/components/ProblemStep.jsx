import React, { useState, useEffect } from 'react';
import { Target, HelpCircle, Layers, CheckCircle2, ArrowRight, BarChart } from 'lucide-react';
import axios from 'axios';

export default function ProblemStep({ sessionId, backendUrl, datasetColumns, onProblemConfirmed }) {
  const [targetCol, setTargetCol] = useState('');
  const [problemInfo, setProblemInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchDetection();
    }
  }, [sessionId]);

  const fetchDetection = async (selectedTarget = null) => {
    setLoading(true);
    try {
      const url = selectedTarget 
        ? `${backendUrl}/api/detect_problem/${sessionId}?target_col=${encodeURIComponent(selectedTarget)}`
        : `${backendUrl}/api/detect_problem/${sessionId}`;
      const res = await axios.get(url);
      setProblemInfo(res.data);
      if (res.data.suggested_target) {
        setTargetCol(res.data.suggested_target);
      }
      onProblemConfirmed(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTargetChange = (e) => {
    const val = e.target.value;
    setTargetCol(val);
    fetchDetection(val);
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-cyan-400" />
            3. Automated Problem & Task Detection
          </h2>
          <p className="text-xs text-gray-400">
            Auto-infers whether the machine learning objective is Classification, Regression, or Unsupervised Clustering.
          </p>
        </div>
      </div>

      {/* Target Column Selector Card */}
      <div className="glass-panel p-6 rounded-2xl space-y-5 border-indigo-500/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
              Select Target Column to Predict:
            </label>
            <select
              value={targetCol}
              onChange={handleTargetChange}
              className="select-field text-base font-semibold py-2.5 text-indigo-300"
            >
              <option value="None">-- None (Unsupervised Clustering) --</option>
              {datasetColumns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-2">
              💡 Candidate targets identified based on column name semantics and target variation.
            </p>
          </div>

          {/* Problem Type Detected Badge Card */}
          {problemInfo && (
            <div className="glass-panel p-5 rounded-xl border border-white/10 bg-slate-900/60 space-y-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Detected Problem Type
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-xl text-base font-extrabold shadow-lg ${
                  problemInfo.problem_type === 'classification'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-500/10'
                    : problemInfo.problem_type === 'regression'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-purple-500/10'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
                }`}>
                  {problemInfo.problem_type?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {problemInfo.reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Target Stats Breakdown */}
        {problemInfo && problemInfo.target_stats && Object.keys(problemInfo.target_stats).length > 0 && (
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Target Distribution & Stats
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              {Object.entries(problemInfo.target_stats).map(([k, v]) => (
                <div key={k} className="bg-slate-950/60 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                  <span className="text-gray-400 truncate max-w-[110px]">{k}:</span>
                  <span className="font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
