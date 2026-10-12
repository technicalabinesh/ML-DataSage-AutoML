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
  Scale,
  Download,
  FileSpreadsheet,
  Table,
  Check,
  ChevronDown
} from 'lucide-react';
import axios from 'axios';

export default function CleaningStep({ sessionId, backendUrl, datasetColumns = [], onCleanSuccess }) {
  // 1. Missing Values
  const [missingNum, setMissingNum] = useState('median');
  const [missingCat, setMissingCat] = useState('mode');
  const [missingCatFillValue, setMissingCatFillValue] = useState('Missing');
  const [convertEmptyToNan, setConvertEmptyToNan] = useState(true);

  // 2. Outliers & Duplicates
  const [outlierStrat, setOutlierStrat] = useState('none');
  const [percentileLower, setPercentileLower] = useState(0.01);
  const [percentileUpper, setPercentileUpper] = useState(0.99);
  const [duplicateStrat, setDuplicateStrat] = useState('exact');
  const [duplicateSubsetCols, setDuplicateSubsetCols] = useState([]);
  const [duplicateKeep, setDuplicateKeep] = useState('first');

  // 3. Format & Type Normalization
  const [stripWhitespace, setStripWhitespace] = useState(true);
  const [caseNorm, setCaseNorm] = useState('none');
  const [handleCurrencyCommas, setHandleCurrencyCommas] = useState(true);
  const [preserveLeadingZeros, setPreserveLeadingZeros] = useState(true);
  const [parseDates, setParseDates] = useState(false);

  // 4. Scaling & Encoding
  const [scalingStrat, setScalingStrat] = useState('none');
  const [encodingStrat, setEncodingStrat] = useState('none');
  const [dropFirst, setDropFirst] = useState(false);

  // 5. Feature Selection
  const [removeIdentifiers, setRemoveIdentifiers] = useState(false);
  const [removeConstants, setRemoveConstants] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [report, setReport] = useState(null);
  const [headPreview, setHeadPreview] = useState([]);
  const [activeReportTab, setActiveReportTab] = useState('summary'); // 'summary' | 'preview' | 'columns'
  const [error, setError] = useState(null);

  const handleDownloadCleaned = async (format = 'csv') => {
    if (!sessionId) return;
    if (format === 'xlsx') {
      setDownloadingExcel(true);
    } else {
      setDownloadingCsv(true);
    }
    setError(null);
    try {
      const res = await axios.get(`${backendUrl}/api/download_cleaned/${sessionId}?format=${format}`, {
        responseType: 'blob'
      });
      const mime = format === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : 'text/csv';
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const blob = new Blob([res.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cleaned_dataset.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Failed to download cleaned ${format}:`, err);
      setError(`Failed to download cleaned ${format.toUpperCase()}. Please clean dataset first.`);
    } finally {
      if (format === 'xlsx') {
        setDownloadingExcel(false);
      } else {
        setDownloadingCsv(false);
      }
    }
  };

  const handleClean = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${backendUrl}/api/clean`, {
        session_id: sessionId,
        missing_num_strategy: missingNum,
        missing_cat_strategy: missingCat,
        missing_cat_fill_value: missingCatFillValue,
        convert_empty_to_nan: convertEmptyToNan,
        duplicate_strategy: duplicateStrat,
        duplicate_subset_cols: duplicateSubsetCols.length > 0 ? duplicateSubsetCols : null,
        duplicate_keep: duplicateKeep,
        remove_duplicates: duplicateStrat !== 'none',
        outlier_strategy: outlierStrat,
        percentile_lower: parseFloat(percentileLower) || 0.01,
        percentile_upper: parseFloat(percentileUpper) || 0.99,
        strip_whitespace: stripWhitespace,
        case_normalization: caseNorm,
        handle_currency_commas: handleCurrencyCommas,
        preserve_leading_zeros: preserveLeadingZeros,
        parse_dates: parseDates,
        scaling_strategy: scalingStrat,
        encoding_strategy: encodingStrat,
        drop_first: dropFirst,
        remove_identifiers: removeIdentifiers,
        remove_constants: removeConstants
      });
      setReport(res.data.report);
      setHeadPreview(res.data.head_preview || []);
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
            Deterministic, configurable data-cleaning pipeline: missing values, outliers, deduplication, format normalization, and leakage prevention.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleDownloadCleaned('csv')}
            disabled={downloadingCsv}
            className="bg-white hover:bg-[#f6eee3] text-[#1c1917] border border-[#e8dfd2] cursor-pointer shadow-xs text-xs py-2.5 px-3.5 font-black flex items-center gap-1.5 rounded-xl transition-all"
            title="Download Cleaned Dataset (CSV)"
          >
            {downloadingCsv ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download CSV</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleDownloadCleaned('xlsx')}
            disabled={downloadingExcel}
            className="bg-white hover:bg-[#f6eee3] text-[#1c1917] border border-[#e8dfd2] cursor-pointer shadow-xs text-xs py-2.5 px-3.5 font-black flex items-center gap-1.5 rounded-xl transition-all"
            title="Download Cleaned Dataset (Excel .xlsx)"
          >
            {downloadingExcel ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Download Excel</span>
              </>
            )}
          </button>

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
            <p className="text-[11px] font-bold text-[#57534e] leading-tight">Configurable imputation for incomplete columns.</p>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="text-[#1c1917] font-black block mb-1">Numerical Features</label>
                <select
                  value={missingNum}
                  onChange={(e) => setMissingNum(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="median">Median Imputation (Outlier robust)</option>
                  <option value="mean">Mean Imputation</option>
                  <option value="zero">Fill with Zero (0)</option>
                  <option value="drop">Drop Rows with Missing Values</option>
                  <option value="keep">Leave Unchanged</option>
                  <option value="knn">KNN Imputation (Estimate)</option>
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
                  <option value="missing">Fill with Custom Category</option>
                  <option value="drop">Drop Rows with Missing Values</option>
                  <option value="keep">Leave Unchanged</option>
                  <option value="knn">KNN Imputation</option>
                </select>
              </div>

              {missingCat === 'missing' && (
                <div>
                  <label className="text-[#1c1917] font-black block mb-1">Custom Fill Label</label>
                  <input
                    type="text"
                    value={missingCatFillValue}
                    onChange={(e) => setMissingCatFillValue(e.target.value)}
                    className="input-field py-1.5 text-xs font-bold text-[#1c1917] bg-[#fbf8f3] border border-[#d6cbbe]"
                    placeholder="e.g. Missing, Unknown"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer text-[#1c1917] font-bold pt-1">
                <input
                  type="checkbox"
                  checked={convertEmptyToNan}
                  onChange={(e) => setConvertEmptyToNan(e.target.checked)}
                  className="w-4 h-4 accent-black rounded cursor-pointer"
                />
                <span className="text-[11px]">Treat empty & whitespace strings as NaN</span>
              </label>
            </div>
          </div>

          <div className="text-[11px] text-[#854d0e] bg-[#fef9c3] p-2.5 rounded-xl border border-[#fef08a] font-bold">
            💡 Target columns are never imputed without explicit configuration.
          </div>
        </div>

        {/* Module 2: Outliers & Duplicates */}
        <div className="bg-white p-5 rounded-2xl space-y-4 border border-[#e8dfd2] shadow-xs hover:border-black/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <h3 className="text-sm font-black text-[#1c1917]">2. Outliers & Duplicates</h3>
            </div>
            <p className="text-[11px] font-bold text-[#57534e] leading-tight">Controlled clipping & safe deduplication.</p>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="text-[#1c1917] font-black block mb-1">Outlier Treatment</label>
                <select
                  value={outlierStrat}
                  onChange={(e) => setOutlierStrat(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="none">Keep Outliers Unchanged (Safe)</option>
                  <option value="iqr_cap">IQR Clipping (Winsorization 1.5*IQR)</option>
                  <option value="zscore_cap">Z-Score 3-Sigma Clipping</option>
                  <option value="percentile_cap">Percentile Clipping (Custom %)</option>
                  <option value="remove_rows">Remove Outlier Rows (Explicit)</option>
                </select>
              </div>

              {outlierStrat === 'percentile_cap' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#78716c] font-black">Lower (e.g. 0.01)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="0.2"
                      value={percentileLower}
                      onChange={(e) => setPercentileLower(e.target.value)}
                      className="input-field py-1 text-xs font-bold text-[#1c1917] bg-[#fbf8f3] border border-[#d6cbbe]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#78716c] font-black">Upper (e.g. 0.99)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.8"
                      max="1.0"
                      value={percentileUpper}
                      onChange={(e) => setPercentileUpper(e.target.value)}
                      className="input-field py-1 text-xs font-bold text-[#1c1917] bg-[#fbf8f3] border border-[#d6cbbe]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[#1c1917] font-black block mb-1">Duplicate Removal</label>
                <select
                  value={duplicateStrat}
                  onChange={(e) => setDuplicateStrat(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="exact">Remove Exact Duplicate Rows</option>
                  <option value="none">Keep Duplicates Unchanged</option>
                  <option value="subset">Remove by Selected Subset Columns</option>
                </select>
              </div>

              {duplicateStrat !== 'none' && (
                <div>
                  <label className="text-[#1c1917] font-black block mb-1">Keep Occurrence</label>
                  <select
                    value={duplicateKeep}
                    onChange={(e) => setDuplicateKeep(e.target.value)}
                    className="select-field text-xs font-bold text-[#1c1917]"
                  >
                    <option value="first">Retain First Occurrence (Default)</option>
                    <option value="last">Retain Last Occurrence</option>
                  </select>
                </div>
              )}

              {duplicateStrat === 'subset' && datasetColumns.length > 0 && (
                <div className="space-y-1.5 p-2 bg-[#f6eee3] rounded-xl border border-[#e8dfd2] max-h-20 overflow-y-auto">
                  <div className="text-[10px] text-[#78716c] font-black uppercase">Subset Columns:</div>
                  <div className="flex flex-wrap gap-1">
                    {datasetColumns.slice(0, 15).map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => toggleSubsetCol(col)}
                        className={`text-[9px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
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
            💡 Identifiers, target, and binary flags are excluded from outlier clipping.
          </div>
        </div>

        {/* Module 3: Format & Type Correction */}
        <div className="bg-white p-5 rounded-2xl space-y-4 border border-[#e8dfd2] shadow-xs hover:border-black/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-600" />
              <h3 className="text-sm font-black text-[#1c1917]">3. Format Normalization</h3>
            </div>
            <p className="text-[11px] font-bold text-[#57534e] leading-tight">Correct string types, currency & whitespace.</p>

            <div className="space-y-2.5 pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#1c1917] font-bold">
                <input
                  type="checkbox"
                  checked={stripWhitespace}
                  onChange={(e) => setStripWhitespace(e.target.checked)}
                  className="w-4 h-4 accent-black rounded cursor-pointer"
                />
                <span className="text-[11px]">Trim leading & trailing whitespace</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#1c1917] font-bold">
                <input
                  type="checkbox"
                  checked={handleCurrencyCommas}
                  onChange={(e) => setHandleCurrencyCommas(e.target.checked)}
                  className="w-4 h-4 accent-black rounded cursor-pointer"
                />
                <span className="text-[11px]">Clean currency & commas ($1,200 ➔ 1200)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#1c1917] font-bold">
                <input
                  type="checkbox"
                  checked={preserveLeadingZeros}
                  onChange={(e) => setPreserveLeadingZeros(e.target.checked)}
                  className="w-4 h-4 accent-black rounded cursor-pointer"
                />
                <span className="text-[11px]">Preserve postal/ID leading zeros (00123)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#1c1917] font-bold">
                <input
                  type="checkbox"
                  checked={parseDates}
                  onChange={(e) => setParseDates(e.target.checked)}
                  className="w-4 h-4 accent-black rounded cursor-pointer"
                />
                <span className="text-[11px]">Reliable datetime parsing</span>
              </label>

              <div className="pt-1">
                <label className="text-[#1c1917] font-black block mb-1">Text Casing</label>
                <select
                  value={caseNorm}
                  onChange={(e) => setCaseNorm(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="none">Preserve Original Casing</option>
                  <option value="lower">Normalize to lowercase</option>
                  <option value="upper">Normalize to UPPERCASE</option>
                  <option value="title">Normalize to Title Case</option>
                </select>
              </div>

              <div className="pt-1 border-t border-[#f0e8dc] space-y-1">
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
            💡 Arbitrary strings are never converted to numeric without format validation.
          </div>
        </div>

        {/* Module 4: ML Preprocessing (Optional) */}
        <div className="bg-white p-5 rounded-2xl space-y-4 border border-[#e8dfd2] shadow-xs hover:border-black/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-600" />
              <h3 className="text-sm font-black text-[#1c1917]">4. ML Encoding & Scaling</h3>
            </div>
            <p className="text-[11px] font-bold text-[#57534e] leading-tight">Optional transformations. Kept raw by default.</p>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="text-[#1c1917] font-black block mb-1">Feature Scaling</label>
                <select
                  value={scalingStrat}
                  onChange={(e) => setScalingStrat(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="none">No Scaling (Recommended; raw clean data)</option>
                  <option value="standard">StandardScaler (Mean=0, Std=1)</option>
                  <option value="minmax">MinMaxScaler ([0, 1])</option>
                  <option value="robust">RobustScaler (Median & IQR)</option>
                </select>
              </div>

              <div>
                <label className="text-[#1c1917] font-black block mb-1">Categorical Encoding</label>
                <select
                  value={encodingStrat}
                  onChange={(e) => setEncodingStrat(e.target.value)}
                  className="select-field text-xs font-bold text-[#1c1917]"
                >
                  <option value="none">No Encoding (Recommended; ML pipeline encodes)</option>
                  <option value="onehot">One-Hot Encoding</option>
                  <option value="ordinal">Ordinal Encoding</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#1c1917] font-bold">
                  <input
                    type="checkbox"
                    checked={removeIdentifiers}
                    onChange={(e) => setRemoveIdentifiers(e.target.checked)}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                  <span className="text-[11px]">Prune high-cardinality ID columns</span>
                </label>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#3f6212] bg-[#ecfccb] p-2.5 rounded-xl border border-[#d9f99d] font-bold">
            💡 ML Training Pipeline automatically isolates scalers & encoders to training splits.
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#e8dfd2] pb-4">
            <div>
              <h3 className="text-base font-black text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Data Cleaning & Validation Report
              </h3>
              <span className="text-xs text-[#78716c] font-bold mt-0.5 block">
                Rows: {report.initial_rows} ➔ {report.final_rows} • Cols: {report.initial_cols} ➔ {report.final_cols} • Validation Status: <span className="uppercase text-emerald-700 font-black">{report.validation_status || 'Passed'}</span>
              </span>
            </div>

            {/* Quick Export Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleDownloadCleaned('csv')}
                disabled={downloadingCsv}
                className="bg-[#1c1917] hover:bg-black text-white text-xs font-black py-2 px-3.5 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                title="Download preprocessed CSV"
              >
                <Download className="w-3.5 h-3.5 text-lime-300" />
                <span>{downloadingCsv ? 'Downloading...' : 'Export CSV'}</span>
              </button>
              <button
                onClick={() => handleDownloadCleaned('xlsx')}
                disabled={downloadingExcel}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black py-2 px-3.5 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                title="Download preprocessed Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>{downloadingExcel ? 'Downloading...' : 'Export Excel (.xlsx)'}</span>
              </button>
            </div>
          </div>

          {/* Metric Stat Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#fbf8f3] p-3.5 rounded-2xl border border-[#e8dfd2]">
              <div className="text-[#78716c] font-black uppercase text-[10px]">Duplicates Removed</div>
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

          {/* Tabs Navigation for Report Breakdown */}
          <div className="flex items-center gap-2 border-b border-[#e8dfd2] pt-2">
            <button
              onClick={() => setActiveReportTab('summary')}
              className={`pb-2.5 px-3 text-xs font-black cursor-pointer border-b-2 transition-all ${
                activeReportTab === 'summary'
                  ? 'border-black text-[#1c1917]'
                  : 'border-transparent text-[#78716c] hover:text-black'
              }`}
            >
              Transformation History
            </button>
            <button
              onClick={() => setActiveReportTab('preview')}
              className={`pb-2.5 px-3 text-xs font-black cursor-pointer border-b-2 transition-all ${
                activeReportTab === 'preview'
                  ? 'border-black text-[#1c1917]'
                  : 'border-transparent text-[#78716c] hover:text-black'
              }`}
            >
              Cleaned Data Preview ({headPreview.length} rows)
            </button>
            <button
              onClick={() => setActiveReportTab('columns')}
              className={`pb-2.5 px-3 text-xs font-black cursor-pointer border-b-2 transition-all ${
                activeReportTab === 'columns'
                  ? 'border-black text-[#1c1917]'
                  : 'border-transparent text-[#78716c] hover:text-black'
              }`}
            >
              Per-Column Audit ({report.per_column_report?.length || 0} cols)
            </button>
          </div>

          {/* Tab 1: Transformation History */}
          {activeReportTab === 'summary' && (
            <div className="space-y-3">
              {report.class_imbalance && (
                <div className="p-4 rounded-2xl bg-[#fffbeb] border border-[#fef08a] flex items-start gap-3 text-xs text-[#92400e]">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#78350f]">Class Imbalance Detected on &apos;{report.class_imbalance.column}&apos;:</strong> Minority class is only {report.class_imbalance.minority_share_percent}%.
                    <p className="text-[#92400e] mt-1 font-semibold">
                      Per best practice, the pipeline preserves natural class distributions and uses <strong>Stratified K-Fold Cross-Validation</strong> & <strong>Weighted F1-Score</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 text-xs text-[#1c1917] bg-[#fbf8f3] p-4 rounded-2xl border border-[#e8dfd2]">
                <div className="font-black text-[#1c1917] mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Execution Audit Log:
                </div>
                {report.transformations_applied && report.transformations_applied.length > 0 ? (
                  report.transformations_applied.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[#1c1917] font-bold">
                      <span className="text-emerald-600 font-black">✓</span> {t}
                    </div>
                  ))
                ) : (
                  <div className="text-[#78716c] font-bold">No transformations required; dataset is pristine.</div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Cleaned Data Preview */}
          {activeReportTab === 'preview' && (
            <div className="overflow-x-auto rounded-2xl border border-[#e8dfd2] bg-[#fbf8f3]">
              {headPreview.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f0e8dc] text-[#1c1917] font-black border-b border-[#e8dfd2]">
                      {Object.keys(headPreview[0]).map((col) => (
                        <th key={col} className="p-2.5 truncate max-w-[160px] font-mono">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {headPreview.map((row, idx) => (
                      <tr key={idx} className="border-b border-[#e8dfd2] hover:bg-white/60 transition-colors">
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="p-2.5 truncate max-w-[160px] text-[#1c1917] font-mono">
                            {val === null || val === undefined ? (
                              <span className="text-rose-500 italic font-bold">null</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-[#78716c] font-bold">
                  No preview rows available.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Per-Column Audit Table */}
          {activeReportTab === 'columns' && (
            <div className="overflow-x-auto rounded-2xl border border-[#e8dfd2] bg-white">
              {report.per_column_report && report.per_column_report.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f0e8dc] text-[#1c1917] font-black border-b border-[#e8dfd2]">
                      <th className="p-2.5">Column</th>
                      <th className="p-2.5">Data Type</th>
                      <th className="p-2.5">Missing Handled</th>
                      <th className="p-2.5">Outliers Treated</th>
                      <th className="p-2.5">Final Missing</th>
                      <th className="p-2.5">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.per_column_report.map((col, idx) => (
                      <tr key={idx} className="border-b border-[#e8dfd2] hover:bg-[#fbf8f3] transition-colors">
                        <td className="p-2.5 font-bold font-mono text-[#1c1917]">{col.column}</td>
                        <td className="p-2.5 text-[#57534e] font-bold">{col.final_type || col.original_type}</td>
                        <td className="p-2.5 text-emerald-700 font-black">
                          {col.missing_handled_count > 0 ? `+${col.missing_handled_count}` : '0'}
                        </td>
                        <td className="p-2.5 text-amber-700 font-black">
                          {col.outliers_capped_count > 0 ? `${col.outliers_capped_count}` : '0'}
                        </td>
                        <td className="p-2.5 text-[#78716c] font-mono">
                          {col.final_missing_count ?? 0}
                        </td>
                        <td className="p-2.5">
                          <span className="bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] text-[10px] font-black px-2 py-0.5 rounded-full">
                            {col.status || 'Verified'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-[#78716c] font-bold">
                  No per-column data available.
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
