import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  Wand2, 
  Sliders, 
  ArrowRight, 
  ShieldCheck, 
  Info, 
  Layers, 
  Copy, 
  Cpu, 
  AlertTriangle,
  Scale
} from 'lucide-react';
import axios from 'axios';

export default function CleaningStep({ sessionId, backendUrl, datasetColumns = [], onCleanSuccess }) {
  // 1. Missing Values
  const [missingNum, setMissingNum] = useState('median');
  const [missingCat, setMissingCat] = useState('mode');

  // 2. Outliers & Duplicates
  const [outlierStrat, setOutlierStrat] = useState('none');
  const [duplicateStrat, setDuplicateStrat] = useState('exact');
  const [duplicateSubsetCols, setDuplicateSubsetCols] = useState([]);

  // 3. Scaling
  const [scalingStrat, setScalingStrat] = useState('none');

  // 4. Categorical Encoding
  const [encodingStrat, setEncodingStrat] = useState('onehot');
  const [dropFirst, setDropFirst] = useState(false);

  // 5. Feature Selection
  const [removeIdentifiers, setRemoveIdentifiers] = useState(true);
  const [removeConstants, setRemoveConstants] = useState(true);
  
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
        duplicate_strategy: duplicateStrat,
        duplicate_subset_cols: duplicateSubsetCols.length > 0 ? duplicateSubsetCols : null,
        remove_duplicates: duplicateStrat !== 'none',
        outlier_strategy: outlierStrat,
        scaling_strategy: scalingStrat,
        encoding_strategy: encodingStrat,
        drop_first: dropFirst,
        remove_identifiers: removeIdentifiers,
        remove_constants: removeConstants
      });
      setReport(res.data.report);
      onCleanSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to execute auto data cleaning.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSubsetCol = (col) => {
    setDuplicateSubsetCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  return (
    <div className="space-y-6 py-4 animate-slide-up">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-purple-400" />
            2. Auto Data Cleaning & Preprocessing Pipeline
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            Fine-tune automated data transformations: missing value imputation, outlier winsorization, deduplication, feature scaling & categorical encoding.
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Module 1: Missing Value Imputation */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white">1. Missing Values</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">Impute incomplete cells across features.</p>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-gray-300 font-semibold block mb-1">Numerical Features</label>
                <select
                  value={missingNum}
                  onChange={(e) => setMissingNum(e.target.value)}
                  className="select-field"
                >
                  <option value="median">Median (Recommended; outlier robust)</option>
                  <option value="mean">Mean Imputation</option>
                  <option value="zero">Fill with Zero (0)</option>
                  <option value="knn">KNN Imputation (Multi-neighbor estimate)</option>
                  <option value="drop">Drop Rows with Missing</option>
                </select>
              </div>

              <div>
                <label className="text-gray-300 font-semibold block mb-1">Categorical Features</label>
                <select
                  value={missingCat}
                  onChange={(e) => setMissingCat(e.target.value)}
                  className="select-field"
                >
                  <option value="mode">Most Frequent Category (Mode)</option>
                  <option value="missing">Create 'Missing' Category</option>
                  <option value="knn">KNN Imputation (Encoded)</option>
                  <option value="drop">Drop Rows with Missing</option>
                </select>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 font-medium">
            💡 <strong>Recommended:</strong> Median for numbers & Mode for categories.
          </div>
        </div>

        {/* Module 2: Outliers & Duplicates */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 border border-white/10 hover:border-rose-500/40 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white">2. Outliers & Duplicates</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">Mitigate extreme outliers & deduplicate rows.</p>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-gray-300 font-semibold block mb-1">Outlier Treatment</label>
                <select
                  value={outlierStrat}
                  onChange={(e) => setOutlierStrat(e.target.value)}
                  className="select-field"
                >
                  <option value="none">Keep Outliers Unchanged (Default)</option>
                  <option value="iqr_cap">IQR Winsorization (Boundaries clipping)</option>
                  <option value="zscore_cap">Z-Score 3-Sigma Clipping</option>
                  <option value="percentile_cap">Percentile Clipping (1st–99th %)</option>
                  <option value="log_transform">Log1p Transformation (Skewed positive)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-300 font-semibold block mb-1">Duplicate Handling</label>
                <select
                  value={duplicateStrat}
                  onChange={(e) => setDuplicateStrat(e.target.value)}
                  className="select-field"
                >
                  <option value="exact">Remove Exact Duplicate Rows</option>
                  <option value="none">Keep Duplicates</option>
                  <option value="subset">Remove Duplicates by Selected Columns</option>
                </select>
              </div>

              {duplicateStrat === 'subset' && datasetColumns.length > 0 && (
                <div className="space-y-1.5 p-2 bg-slate-900/60 rounded-xl border border-white/10 max-h-24 overflow-y-auto scrollbar-thin">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Select Subset Columns:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {datasetColumns.slice(0, 15).map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => toggleSubsetCol(col)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                          duplicateSubsetCols.includes(col)
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-rose-300/80 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 font-medium">
            💡 <strong>Tree Models:</strong> Keep unchanged initially; clipping helps linear/KNN models.
          </div>
        </div>

        {/* Module 3: Feature Scaling */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white">3. Feature Scaling</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">Normalize magnitude across numeric features.</p>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-gray-300 font-semibold block mb-1">Scaling Strategy</label>
                <select
                  value={scalingStrat}
                  onChange={(e) => setScalingStrat(e.target.value)}
                  className="select-field"
                >
                  <option value="none">No Scaling (Default for Tree / Boosting)</option>
                  <option value="standard">StandardScaler (Mean=0, Std=1; Logistic/KNN)</option>
                  <option value="minmax">MinMaxScaler (Scale to [0, 1])</option>
                  <option value="robust">RobustScaler (Median & IQR based)</option>
                  <option value="maxabs">MaxAbsScaler (Preserves sparsity)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-gray-300 font-semibold block text-[11px]">Feature Selection Toggles</label>
                
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-all">
                  <input
                    type="checkbox"
                    checked={removeIdentifiers}
                    onChange={(e) => setRemoveIdentifiers(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="text-[11px]">Drop unique ID / UUID columns</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-all">
                  <input
                    type="checkbox"
                    checked={removeConstants}
                    onChange={(e) => setRemoveConstants(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                  <span className="text-[11px]">Drop constant zero-variance columns</span>
                </label>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-cyan-300/80 bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/20 font-medium">
            💡 <strong>Trees:</strong> Scaling is unnecessary for LightGBM, Random Forest, & HistGradient.
          </div>
        </div>

        {/* Module 4: Categorical Encoding */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 border border-white/10 hover:border-lime-500/40 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white">4. Categorical Encoding</h3>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">Convert strings into model-digestible vectors.</p>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-gray-300 font-semibold block mb-1">Encoding Strategy</label>
                <select
                  value={encodingStrat}
                  onChange={(e) => setEncodingStrat(e.target.value)}
                  className="select-field"
                >
                  <option value="onehot">One-Hot Encoding (Best general baseline)</option>
                  <option value="ordinal">Ordinal Encoding (Preserves rank order)</option>
                  <option value="label">Label Encoding (Integer index)</option>
                  <option value="frequency">Frequency / Count Encoding</option>
                  <option value="target">Target Encoding (High cardinality smoothed)</option>
                  <option value="none">Keep Raw (Pipeline Encodes Later)</option>
                </select>
              </div>

              {encodingStrat === 'onehot' && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-all">
                    <input
                      type="checkbox"
                      checked={dropFirst}
                      onChange={(e) => setDropFirst(e.target.checked)}
                      className="w-4 h-4 accent-lime-400 rounded cursor-pointer"
                    />
                    <span className="text-[11px]">Drop First Category (Reduces collinearity)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-lime-300/80 bg-lime-500/10 p-2.5 rounded-xl border border-lime-500/20 font-medium">
            💡 <strong>Default:</strong> One-Hot Encoding for nominal features without data leakage.
          </div>
        </div>

      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm text-center font-bold animate-slide-up">
          ⚠️ {error}
        </div>
      )}

      {/* Cleaning Results Summary Card */}
      {report && (
        <div className="glass-panel p-6 rounded-3xl border-emerald-500/30 space-y-5 bg-emerald-950/15 animate-slide-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <h3 className="text-base font-extrabold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Automated Data Cleaning Successfully Executed!
            </h3>
            <span className="text-xs text-gray-300 font-mono bg-slate-900/80 px-3 py-1 rounded-full border border-white/10">
              Rows: {report.initial_rows} ➔ {report.final_rows} • Cols: {report.initial_cols} ➔ {report.final_cols}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900/70 p-3.5 rounded-2xl border border-white/5">
              <div className="text-gray-400 font-semibold">Duplicates Handled</div>
              <div className="text-xl font-black text-white mt-1">{report.duplicates_removed} rows</div>
            </div>
            <div className="bg-slate-900/70 p-3.5 rounded-2xl border border-white/5">
              <div className="text-gray-400 font-semibold">Missing Imputed</div>
              <div className="text-xl font-black text-emerald-400 mt-1">{report.missing_filled} cells</div>
            </div>
            <div className="bg-slate-900/70 p-3.5 rounded-2xl border border-white/5">
              <div className="text-gray-400 font-semibold">Outliers Treated</div>
              <div className="text-xl font-black text-amber-400 mt-1">{report.outliers_capped} values</div>
            </div>
            <div className="bg-slate-900/70 p-3.5 rounded-2xl border border-white/5">
              <div className="text-gray-400 font-semibold">Features Pruned</div>
              <div className="text-xl font-black text-purple-400 mt-1">{report.removed_columns?.length || 0} cols</div>
            </div>
          </div>

          {/* Class Imbalance Intelligence Alert */}
          {report.class_imbalance && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-200">Class Imbalance Detected on '{report.class_imbalance.column}':</strong> Minority class is only {report.class_imbalance.minority_share_percent}%.
                <p className="text-gray-300 mt-1">
                  Per best practice, the pipeline will preserve natural class distributions and automatically utilize <strong>Stratified K-Fold Cross-Validation</strong> & <strong>Weighted F1-Score</strong> rather than artificial resampling.
                </p>
              </div>
            </div>
          )}

          {/* Transformations Log */}
          <div className="space-y-1.5 text-xs text-gray-300 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <div className="font-extrabold text-gray-400 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-lime-400" />
              Applied Pipeline Transformations:
            </div>
            {report.transformations_applied.length > 0 ? (
              report.transformations_applied.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2 text-emerald-300 font-medium">
                  <span className="text-emerald-400 font-bold">✓</span> {t}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No transformations required; dataset is already clean!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
