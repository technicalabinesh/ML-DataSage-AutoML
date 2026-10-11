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
    <div className="space-y-6 py-2 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1c1917] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1c1917] text-white flex items-center justify-center">
              <Target className="w-4 h-4 text-cyan-400" />
            </div>
            3. Automated Problem & Task Detection
          </h2>
          <p className="text-xs font-bold text-[#57534e] mt-1">
            Auto-infers whether the machine learning objective is Classification, Regression, or Unsupervised Clustering.
          </p>
        </div>
      </div>

      {/* Target Column Selector Card */}
      <div className="bg-white p-6 rounded-2xl space-y-5 border border-[#e8dfd2] shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="text-xs font-black text-[#1c1917] uppercase tracking-wider block mb-2">
              Select Target Column to Predict:
            </label>
            <select
              value={targetCol}
              onChange={handleTargetChange}
              className="select-field text-sm font-black py-2.5 text-[#1c1917] bg-[#fbf8f3] border border-[#d6cbbe]"
            >
              <option value="None">-- None (Unsupervised Clustering) --</option>
              {datasetColumns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
            <p className="text-xs font-bold text-[#78716c] mt-2">
              💡 Candidate targets identified based on column name semantics and target variation.
            </p>
          </div>

          {/* Problem Type Detected Badge Card */}
          {problemInfo && (
            <div className="p-5 rounded-2xl border border-[#e8dfd2] bg-[#fbf8f3] space-y-3 shadow-2xs">
              <div className="text-[11px] font-black text-[#78716c] uppercase tracking-wider">
                Detected Problem Type
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full text-sm font-black tracking-wide ${
                  problemInfo.problem_type === 'classification'
                    ? 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]'
                    : problemInfo.problem_type === 'regression'
                    ? 'bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff]'
                    : 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]'
                }`}>
                  {problemInfo.problem_type?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#1c1917] font-semibold leading-relaxed">
                {problemInfo.reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Target Stats Breakdown */}
        {problemInfo && problemInfo.target_stats && Object.keys(problemInfo.target_stats).length > 0 && (
          <div className="pt-4 border-t border-[#e8dfd2] space-y-3">
            <h4 className="text-xs font-black text-[#1c1917] uppercase tracking-wider">
              Target Distribution & Stats
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              {Object.entries(problemInfo.target_stats).map(([k, v]) => (
                <div key={k} className="bg-[#f6eee3] p-3 rounded-xl border border-[#e8dfd2] flex justify-between items-center">
                  <span className="text-[#78716c] font-bold truncate max-w-[110px]">{k}:</span>
                  <span className="font-black text-[#1c1917]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
