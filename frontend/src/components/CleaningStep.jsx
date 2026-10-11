import React, { useState } from 'react';
import { Sparkles, CheckCircle2, RefreshCw, Wand2, Sliders, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';

export default function CleaningStep({ sessionId, backendUrl, onCleanSuccess }) {
  const [missingNum, setMissingNum] = useState('median');
  const [missingCat, setMissingCat] = useState('mode');
  const [removeDups, setRemoveDups] = useState(true);
  const [outlierStrat, setOutlierStrat] = useState('iqr_cap');
  const [scalingStrat, setScalingStrat] = useState('standard');
  const [encodingStrat, setEncodingStrat] = useState('auto');
  
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleClean = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${backendUrl}/api/clean`, {
        session_id: sessionId,
        missing_num_strategy: missingNum,
        missing_cat_strategy: missingCat,
        remove_duplicates: removeDups,
        outlier_strategy: outlierStrat,
        scaling_strategy: scalingStrat,
        encoding_strategy: encodingStrat
      });
      setReport(res.data.report);
      onCleanSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to execute auto data cleaning.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-purple-400" />
            2. Auto Data Cleaning & Preprocessing Pipeline
          </h2>
          <p className="text-xs text-gray-400">
            Configure automated ETL data cleaning rules: missing value imputation, outlier clipping, deduplication, encoding & scaling.
          </p>
        </div>

        <button
          onClick={handleClean}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Executing Cleaning...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Run Auto Data Cleaning</span>
            </>
          )}
        </button>
      </div>

      {/* Cleaning Config Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Missing Values Imputation */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            Missing Value Imputation
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-300 font-medium block mb-1">Numerical Features</label>
              <select
                value={missingNum}
                onChange={(e) => setMissingNum(e.target.value)}
                className="select-field"
              >
                <option value="median">Median Imputation (Recommended)</option>
                <option value="mean">Mean Imputation</option>
                <option value="zero">Fill with Zero (0)</option>
                <option value="drop">Drop Rows with Missing</option>
              </select>
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">Categorical Features</label>
              <select
                value={missingCat}
                onChange={(e) => setMissingCat(e.target.value)}
                className="select-field"
              >
                <option value="mode">Most Frequent Category (Mode)</option>
                <option value="missing">Create 'Missing' Category</option>
                <option value="drop">Drop Rows</option>
              </select>
            </div>
          </div>
        </div>

        {/* Outliers & Duplicates */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            Outliers & Duplicates
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-300 font-medium block mb-1">Outlier Treatment</label>
              <select
                value={outlierStrat}
                onChange={(e) => setOutlierStrat(e.target.value)}
                className="select-field"
              >
                <option value="iqr_cap">IQR Winsorization Clipping (Cap extreme values)</option>
                <option value="zscore_cap">Z-Score 3-Sigma Clipping</option>
                <option value="none">Keep Outliers Unchanged</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-gray-200">
                <input
                  type="checkbox"
                  checked={removeDups}
                  onChange={(e) => setRemoveDups(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
                <span>Automatically remove duplicate rows</span>
              </label>
            </div>
          </div>
        </div>

        {/* Feature Scaling & Encoding */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            Scaling & Encoding
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-300 font-medium block mb-1">Feature Scaling</label>
              <select
                value={scalingStrat}
                onChange={(e) => setScalingStrat(e.target.value)}
                className="select-field"
              >
                <option value="standard">StandardScaler (Mean=0, Std=1)</option>
                <option value="minmax">MinMaxScaler (Scale to [0, 1])</option>
                <option value="robust">RobustScaler (Median & IQR based)</option>
                <option value="none">No Scaling</option>
              </select>
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">Categorical Encoding</label>
              <select
                value={encodingStrat}
                onChange={(e) => setEncodingStrat(e.target.value)}
                className="select-field"
              >
                <option value="auto">Auto (One-Hot for ≤10 unique, Label for high)</option>
                <option value="onehot">One-Hot Encoding</option>
                <option value="label">Label Encoding</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm text-center">
          ⚠️ {error}
        </div>
      )}

      {/* Cleaning Results Summary Card */}
      {report && (
        <div className="glass-panel p-6 rounded-2xl border-emerald-500/30 space-y-4 bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ETL Data Cleaning Successfully Applied!
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              Dataset Rows: {report.initial_rows} ➔ {report.final_rows}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5">
              <div className="text-gray-400">Duplicates Removed</div>
              <div className="text-lg font-bold text-white">{report.duplicates_removed} rows</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5">
              <div className="text-gray-400">Missing Values Filled</div>
              <div className="text-lg font-bold text-emerald-400">{report.missing_filled} cells</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5">
              <div className="text-gray-400">Outliers Capped</div>
              <div className="text-lg font-bold text-amber-400">{report.outliers_capped} values</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5">
              <div className="text-gray-400">Final Shape</div>
              <div className="text-lg font-bold text-indigo-400">{report.final_rows} x {report.final_cols}</div>
            </div>
          </div>

          <div className="space-y-1 text-xs text-gray-300">
            <div className="font-semibold text-gray-400 mb-1">Transformations Log:</div>
            {report.transformations_applied.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2 text-emerald-300">
                <span>✓</span> {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
