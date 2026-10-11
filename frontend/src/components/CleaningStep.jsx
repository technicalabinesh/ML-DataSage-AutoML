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
      setError(err.response?.data?.detail || "Failed to execute auto data cleaning. Please verify dataset format.");
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
    <div className="space-y-6 py-2 animate-slide-up">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1c1917] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1c1917] text-white flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-purple-400" />
            </div>
            2. Auto Data Cleaning & Preprocessing Pipeline
          </h2>
          <p className="text-xs font-bold text-[#57534e] mt-1">
            Fine-tune automated data transformations: missing value imputation, outlier winsorization, deduplication, feature scaling & categorical encoding.
          </p>
        </div>

        <button
          onClick={handleClean}
          disabled={loading}
          className="btn-primary cursor-pointer shadow-md text-xs py-2.5 px-6 font-extrabold flex items-center gap-2"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Module 1: Missing Value Imputation */}
        <div className="bg-white p-5 rounded-2xl space-y-4 border border-[#e8dfd2] shadow-xs hover:border-black/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <h3 className="text-sm font-black text-[#1c1917]">1. Missing Values</h3>
            </div>
            <p className="text-[11px] font-bold text-[#57534e] leading-tight">Impute incomplete cells across features.</p>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="text-[#1c1917] font-black block mb-1">Numerical Features</label>
                <select
                  value={missingNum}
                  onChange={(e) => setMissingNum(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="median">Median (Recommended; outlier robust)</option>
                  <option value="mean">Mean Imputation</option>
                  <option value="zero">Fill with Zero (0)</option>
                  <option value="knn">KNN Imputation (Multi-neighbor estimate)</option>
                  <option value="drop">Drop Rows with Missing</option>
                </select>
              </div>

              <div>
                <label className="text-[#1c1917] font-black block mb-1">Categorical Features</label>
                <select
                  value={missingCat}
                  onChange={(e) => setMissingCat(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="mode">Most Frequent Category (Mode)</option>
                  <option value="missing">Create &apos;Missing&apos; Category</option>
                  <option value="knn">KNN Imputation (Encoded)</option>
                  <option value="drop">Drop Rows with Missing</option>
                </select>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#854d0e] bg-[#fef9c3] p-2.5 rounded-xl border border-[#fef08a] font-bold">
            💡 <strong>Recommended:</strong> Median for numbers & Mode for categories.
          </div>
        </div>

        {/* Module 2: Outliers & Duplicates */}
        <div className="bg-white p-5 rounded-2xl space-y-4 border border-[#e8dfd2] shadow-xs hover:border-black/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <h3 className="text-sm font-black text-[#1c1917]">2. Outliers & Duplicates</h3>
            </div>
            <p className="text-[11px] font-bold text-[#57534e] leading-tight">Mitigate extreme outliers & deduplicate rows.</p>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="text-[#1c1917] font-black block mb-1">Outlier Treatment</label>
                <select
                  value={outlierStrat}
                  onChange={(e) => setOutlierStrat(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="none">Keep Outliers Unchanged (Default)</option>
                  <option value="iqr_cap">IQR Winsorization (Boundaries clipping)</option>
                  <option value="zscore_cap">Z-Score 3-Sigma Clipping</option>
                  <option value="percentile_cap">Percentile Clipping (1st–99th %)</option>
                  <option value="log_transform">Log1p Transformation (Skewed positive)</option>
                </select>
              </div>

              <div>
                <label className="text-[#1c1917] font-black block mb-1">Duplicate Handling</label>
                <select
                  value={duplicateStrat}
                  onChange={(e) => setDuplicateStrat(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="exact">Remove Exact Duplicate Rows</option>
                  <option value="none">Keep Duplicates</option>
                  <option value="subset">Remove Duplicates by Selected Columns</option>
                </select>
              </div>

              {duplicateStrat === 'subset' && datasetColumns.length > 0 && (
                <div className="space-y-1.5 p-2 bg-[#f6eee3] rounded-xl border border-[#e8dfd2] max-h-24 overflow-y-auto">
                  <div className="text-[10px] text-[#78716c] font-black uppercase">Select Subset Columns:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {datasetColumns.slice(0, 15).map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => toggleSubsetCol(col)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                          duplicateSubsetCols.includes(col)
                            ? 'bg-[#1c1917] text-white'
                            : 'bg-white text-[#1c1917] border border-[#d6cbbe]'
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

          <div className="text-[11px] text-[#9f1239] bg-[#ffe4e6] p-2.5 rounded-xl border border-[#fecdd3] font-bold">
            💡 <strong>Tree Models:</strong> Keep unchanged initially; clipping helps linear/KNN models.
          </div>
        </div>

        {/* Module 3: Feature Scaling */}
        <div className="bg-white p-5 rounded-2xl space-y-4 border border-[#e8dfd2] shadow-xs hover:border-black/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-600" />
              <h3 className="text-sm font-black text-[#1c1917]">3. Feature Scaling</h3>
            </div>
            <p className="text-[11px] font-bold text-[#57534e] leading-tight">Normalize magnitude across numeric features.</p>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="text-[#1c1917] font-black block mb-1">Scaling Strategy</label>
                <select
                  value={scalingStrat}
                  onChange={(e) => setScalingStrat(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="none">No Scaling (Default for Tree / Boosting)</option>
                  <option value="standard">StandardScaler (Mean=0, Std=1; Logistic/KNN)</option>
                  <option value="minmax">MinMaxScaler (Scale to [0, 1])</option>
                  <option value="robust">RobustScaler (Median & IQR based)</option>
                  <option value="maxabs">MaxAbsScaler (Preserves sparsity)</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-[#1c1917] font-black block text-[11px]">Feature Selection Toggles</label>
                
                <label className="flex items-center gap-2 cursor-pointer text-[#1c1917] font-bold">
                  <input
                    type="checkbox"
                    checked={removeIdentifiers}
                    onChange={(e) => setRemoveIdentifiers(e.target.checked)}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                  <span className="text-[11px]">Drop unique ID / UUID columns</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#1c1917] font-bold">
                  <input
                    type="checkbox"
                    checked={removeConstants}
                    onChange={(e) => setRemoveConstants(e.target.checked)}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                  <span className="text-[11px]">Drop constant zero-variance columns</span>
                </label>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#075985] bg-[#e0f2fe] p-2.5 rounded-xl border border-[#bae6fd] font-bold">
            💡 <strong>Trees:</strong> Scaling is unnecessary for LightGBM, Random Forest, & HistGradient.
          </div>
        </div>

        {/* Module 4: Categorical Encoding */}
        <div className="bg-white p-5 rounded-2xl space-y-4 border border-[#e8dfd2] shadow-xs hover:border-black/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-600" />
              <h3 className="text-sm font-black text-[#1c1917]">4. Categorical Encoding</h3>
            </div>
            <p className="text-[11px] font-bold text-[#57534e] leading-tight">Convert strings into model-digestible vectors.</p>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="text-[#1c1917] font-black block mb-1">Encoding Strategy</label>
                <select
                  value={encodingStrat}
                  onChange={(e) => setEncodingStrat(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
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
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[#1c1917] font-bold">
                    <input
                      type="checkbox"
                      checked={dropFirst}
                      onChange={(e) => setDropFirst(e.target.checked)}
                      className="w-4 h-4 accent-black rounded cursor-pointer"
                    />
                    <span className="text-[11px]">Drop First Category (Reduces collinearity)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-[#3f6212] bg-[#ecfccb] p-2.5 rounded-xl border border-[#d9f99d] font-bold">
            💡 <strong>Default:</strong> One-Hot Encoding for nominal features without data leakage.
          </div>
        </div>

      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-sm text-center font-black animate-slide-up">
          ⚠️ {error}
        </div>
      )}

      {/* Cleaning Results Summary Card */}
      {report && (
        <div className="bg-white p-6 rounded-3xl border border-[#bbf7d0] space-y-5 shadow-sm animate-slide-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#e8dfd2] pb-4">
            <h3 className="text-base font-black text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Automated Data Cleaning Successfully Executed!
            </h3>
            <span className="text-xs text-[#1c1917] font-mono font-bold bg-[#f6eee3] px-3 py-1 rounded-full border border-[#e8dfd2]">
              Rows: {report.initial_rows} ➔ {report.final_rows} • Cols: {report.initial_cols} ➔ {report.final_cols}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#fbf8f3] p-3.5 rounded-2xl border border-[#e8dfd2]">
              <div className="text-[#78716c] font-black uppercase text-[10px]">Duplicates Handled</div>
              <div className="text-xl font-black text-[#1c1917] mt-1">{report.duplicates_removed} rows</div>
            </div>
            <div className="bg-[#fbf8f3] p-3.5 rounded-2xl border border-[#e8dfd2]">
              <div className="text-[#78716c] font-black uppercase text-[10px]">Missing Imputed</div>
              <div className="text-xl font-black text-emerald-700 mt-1">{report.missing_filled} cells</div>
            </div>
            <div className="bg-[#fbf8f3] p-3.5 rounded-2xl border border-[#e8dfd2]">
              <div className="text-[#78716c] font-black uppercase text-[10px]">Outliers Treated</div>
              <div className="text-xl font-black text-amber-700 mt-1">{report.outliers_capped} values</div>
            </div>
            <div className="bg-[#fbf8f3] p-3.5 rounded-2xl border border-[#e8dfd2]">
              <div className="text-[#78716c] font-black uppercase text-[10px]">Features Pruned</div>
              <div className="text-xl font-black text-purple-700 mt-1">{report.removed_columns?.length || 0} cols</div>
            </div>
          </div>

          {/* Class Imbalance Intelligence Alert */}
          {report.class_imbalance && (
            <div className="p-4 rounded-2xl bg-[#fffbeb] border border-[#fef08a] flex items-start gap-3 text-xs text-[#92400e]">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#78350f]">Class Imbalance Detected on &apos;{report.class_imbalance.column}&apos;:</strong> Minority class is only {report.class_imbalance.minority_share_percent}%.
                <p className="text-[#92400e] mt-1 font-semibold">
                  Per best practice, the pipeline will preserve natural class distributions and automatically utilize <strong>Stratified K-Fold Cross-Validation</strong> & <strong>Weighted F1-Score</strong> rather than artificial resampling.
                </p>
              </div>
            </div>
          )}

          {/* Transformations Log */}
          <div className="space-y-1.5 text-xs text-[#1c1917] bg-[#fbf8f3] p-4 rounded-2xl border border-[#e8dfd2]">
            <div className="font-black text-[#1c1917] mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Applied Pipeline Transformations:
            </div>
            {report.transformations_applied.length > 0 ? (
              report.transformations_applied.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[#1c1917] font-bold">
                  <span className="text-emerald-600 font-black">✓</span> {t}
                </div>
              ))
            ) : (
              <div className="text-[#78716c] font-bold">No transformations required; dataset is already clean!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
