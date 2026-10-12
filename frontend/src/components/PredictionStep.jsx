import React, { useState, useEffect } from 'react';
import { Play, UploadCloud, Download, Sparkles, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';
import axios from 'axios';

export default function PredictionStep({ sessionId, datasetColumns = [], targetCol, problemType, backendUrl, onPredictionMade }) {
  const [formValues, setFormValues] = useState({});
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Batch & Dataset prediction states
  const [batchFile, setBatchFile] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [currentDatasetLoading, setCurrentDatasetLoading] = useState(false);
  const [cleanedLoading, setCleanedLoading] = useState(false);

  const featureCols = (datasetColumns || []).filter(c => c && c.name && c.name !== targetCol);

  useEffect(() => {
    // Initialize default median/sample values
    const defaults = {};
    featureCols.forEach((c) => {
      if (c.type === 'numerical') {
        defaults[c.name] = c.stats?.median ?? c.stats?.mean ?? 0;
      } else {
        defaults[c.name] = c.stats?.top_category ?? c.sample_values?.[0] ?? '';
      }
    });
    setFormValues(defaults);
  }, [datasetColumns, targetCol]);

  const handleInputChange = (colName, val) => {
    setFormValues(prev => ({ ...prev, [colName]: val }));
  };

  const handlePredictSingle = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${backendUrl}/api/predict`, {
        session_id: sessionId,
        features: formValues
      });
      setPredictionResult(res.data);
      if (onPredictionMade) onPredictionMade(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Prediction request failed. Ensure a model is trained first.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const triggerDownload = (blobData, filename) => {
    const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseBlobError = async (err, defaultMsg) => {
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const json = JSON.parse(text);
        return json.detail || json.error || text;
      } catch {
        return defaultMsg;
      }
    }
    return err.response?.data?.detail || defaultMsg;
  };

  const handleBatchPredict = async () => {
    if (!batchFile) return;
    setBatchLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', batchFile);

    try {
      const res = await axios.post(`${backendUrl}/api/predict_batch`, formData, {
        responseType: 'blob'
      });
      triggerDownload(res.data, `Predicted_${batchFile.name}`);
    } catch (err) {
      const msg = await parseBlobError(err, "Batch prediction failed. Check CSV column names.");
      setError(msg);
    } finally {
      setBatchLoading(false);
    }
  };

  const handlePredictCurrentDataset = async () => {
    setCurrentDatasetLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${backendUrl}/api/predict_current_dataset/${sessionId}`, {
        responseType: 'blob'
      });
      triggerDownload(res.data, `Predicted_Current_Dataset.csv`);
    } catch (err) {
      const msg = await parseBlobError(err, "Failed to generate predictions for current dataset. Train model first.");
      setError(msg);
    } finally {
      setCurrentDatasetLoading(false);
    }
  };

  const handleDownloadCleaned = async () => {
    setCleanedLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${backendUrl}/api/download_cleaned/${sessionId}`, {
        responseType: 'blob'
      });
      triggerDownload(res.data, `Cleaned_Dataset.csv`);
    } catch (err) {
      const msg = await parseBlobError(err, "Failed to download cleaned dataset.");
      setError(msg);
    } finally {
      setCleanedLoading(false);
    }
  };

  const handleDownloadSinglePrediction = () => {
    if (!predictionResult) return;
    const summary = predictionResult.input_summary || formValues;
    const row = {
      ...summary,
      [`Predicted_${targetCol || 'Target'}`]: predictionResult.prediction,
      Model_Confidence: `${predictionResult.confidence}%`
    };
    const headers = Object.keys(row).join(',');
    const values = Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    const csvContent = `${headers}\n${values}`;
    triggerDownload(csvContent, `Single_Prediction_${targetCol || 'Result'}.csv`);
  };

  return (
    <div className="space-y-6 py-2 max-w-5xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1c1917] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1c1917] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            6. Interactive Prediction Interface & Batch Inference
          </h2>
          <p className="text-xs font-bold text-[#57534e] mt-1">
            Predict single records interactively or download batch predictions on test CSVs.
          </p>
        </div>

        {/* Global Action Download Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadCleaned}
            disabled={cleanedLoading}
            className="bg-white hover:bg-[#f6eee3] text-[#1c1917] border border-[#e8dfd2] text-xs font-black py-2 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            title="Download Cleaned Preprocessed CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{cleanedLoading ? 'Downloading...' : 'Download Cleaned CSV'}</span>
          </button>

          <button
            onClick={handlePredictCurrentDataset}
            disabled={currentDatasetLoading}
            className="bg-[#1c1917] hover:bg-black text-white text-xs font-black py-2 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            title="Download current dataset with predictions appended"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{currentDatasetLoading ? 'Scoring...' : 'Download Current Dataset Predictions'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-xs text-center font-black animate-slide-up">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form Column */}
        <div className="lg:col-span-2 bg-white p-7 rounded-3xl space-y-5 border border-[#e8dfd2] shadow-sm">
          <h3 className="text-base font-black text-[#1c1917] border-b border-[#e8dfd2] pb-3 flex items-center justify-between">
            <span>📝 Single Record Prediction Form</span>
            <span className="bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] text-[10px] font-black px-2.5 py-0.5 rounded-full">
              Model Active
            </span>
          </h3>

          <form onSubmit={handlePredictSingle} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-2">
              {featureCols.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-[#78716c] font-bold">
                  No feature columns detected. Please upload a dataset and train a model first.
                </div>
              ) : (
                featureCols.map((c) => (
                <div key={c.name} className="space-y-1">
                  <label className="text-xs font-black text-[#1c1917] block truncate">
                    {c.name} <span className="text-[10px] text-[#78716c] font-bold">({c.type})</span>
                  </label>
                  {c.type === 'numerical' ? (
                    <input
                      type="number"
                      step="any"
                      value={formValues[c.name] ?? ''}
                      onChange={(e) => handleInputChange(c.name, e.target.value)}
                      className="input-field py-2 text-xs font-mono font-bold text-[#1c1917] bg-[#fbf8f3] border border-[#d6cbbe]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formValues[c.name] ?? ''}
                      onChange={(e) => handleInputChange(c.name, e.target.value)}
                      className="input-field py-2 text-xs font-bold text-[#1c1917] bg-[#fbf8f3] border border-[#d6cbbe]"
                    />
                  )}
                </div>
              )))}
            </div>

            <div className="pt-4 border-t border-[#e8dfd2] flex justify-end">
              <button 
                type="submit" 
                disabled={loading} 
                className="btn-primary w-full md:w-auto cursor-pointer text-xs py-2.5 px-6 font-extrabold flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Predicting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-amber-400" />
                    <span>Generate Prediction</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Prediction Results & Batch Inference Column */}
        <div className="space-y-6">
          {/* Result Card */}
          <div className="bg-white p-7 rounded-3xl border border-[#e8dfd2] space-y-4 shadow-sm">
            <h3 className="text-xs font-black text-[#78716c] uppercase tracking-wider">
              Prediction Output
            </h3>

            {predictionResult ? (
              <div className="space-y-4 animate-slide-up">
                <div className="p-5 rounded-2xl bg-[#1c1917] text-white text-center shadow-lg">
                  <div className="text-xs text-amber-300 font-black mb-1 uppercase tracking-wider">Predicted {targetCol}</div>
                  <div className="text-4xl font-black text-white font-mono my-1">
                    {predictionResult.prediction}
                  </div>
                  <div className="text-xs text-gray-300 mt-2 font-bold">
                    Model Likelihood: <span className="bg-white/10 text-amber-300 text-[11px] font-black py-0.5 px-3 rounded-full">{predictionResult.confidence}%</span>
                  </div>
                  {predictionResult.probability_disclaimer && (
                    <p className="text-[10px] text-gray-400 mt-2.5 pt-2 border-t border-white/10 italic leading-tight text-center">
                      ℹ️ {predictionResult.probability_disclaimer}
                    </p>
                  )}
                </div>

                {/* Probabilities Breakdown */}
                {predictionResult.probabilities && Object.keys(predictionResult.probabilities).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#e8dfd2]">
                    <div className="text-xs font-black text-[#78716c] uppercase tracking-wider">Class Probabilities</div>
                    {Object.entries(predictionResult.probabilities).map(([cls, pct]) => (
                      <div key={cls} className="space-y-1 text-xs">
                        <div className="flex justify-between text-[#1c1917] font-bold">
                          <span className="font-mono">{cls}</span>
                          <span className="font-black">{pct}%</span>
                        </div>
                        <div className="w-full bg-[#f3ede4] h-2 rounded-full overflow-hidden">
                          <div className="bg-[#1c1917] h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Single Prediction CSV Export Button */}
                <button
                  type="button"
                  onClick={handleDownloadSinglePrediction}
                  className="w-full bg-[#f6eee3] hover:bg-[#ece4d8] text-[#1c1917] border border-[#e8dfd2] text-xs font-black py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all mt-2"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download This Prediction (CSV)</span>
                </button>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#78716c] font-bold">
                Enter feature values and click &quot;Generate Prediction&quot; to see AI inference output.
              </div>
            )}
          </div>

          {/* Batch CSV Prediction Card */}
          <div className="bg-white p-6 rounded-3xl space-y-3.5 border border-[#e8dfd2] shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#1c1917] uppercase tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                Batch CSV Test Inference
              </h4>
              <span className="text-[10px] font-bold bg-[#c8f2da] text-emerald-950 px-2.5 py-0.5 rounded-full">
                test.csv Ready
              </span>
            </div>
            
            <p className="text-[11px] text-[#57534e] font-bold leading-relaxed">
              Upload your test set (e.g. <code>test.csv</code>) without labels to evaluate all rows and automatically export predictions.
            </p>

            <div className="border border-dashed border-[#d6cbbe] rounded-2xl p-3 bg-[#fbf8f3] text-center space-y-1.5">
              <input
                type="file"
                id="batch-csv-input"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && setBatchFile(e.target.files[0])}
                className="hidden"
              />
              <label 
                htmlFor="batch-csv-input"
                className="cursor-pointer block text-xs font-black text-[#1c1917] hover:underline"
              >
                {batchFile ? (
                  <span className="text-emerald-700 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {batchFile.name} (Ready to Score)
                  </span>
                ) : (
                  <span>📁 Click to browse or drop test.csv</span>
                )}
              </label>
              <div className="text-[10px] text-[#78716c] font-bold">Supported format: CSV (any row count)</div>
            </div>

            <button
              onClick={handleBatchPredict}
              disabled={!batchFile || batchLoading}
              className="w-full btn-primary text-xs py-3 justify-center rounded-xl cursor-pointer font-black flex items-center gap-2 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{batchLoading ? 'Executing Inference...' : 'Download Predicted CSV'}</span>
            </button>
          </div>

          {/* Quick One-Click Current Dataset Inference Card */}
          <div className="bg-[#fbf8f3] p-5 rounded-3xl border border-[#e8dfd2] space-y-2.5 shadow-2xs">
            <div className="text-xs font-black text-[#1c1917] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Score Current Dataset</span>
            </div>
            <p className="text-[11px] text-[#78716c] font-bold">
              Want predictions on your currently loaded training dataset? Run full pipeline scoring with 1 click.
            </p>
            <button
              onClick={handlePredictCurrentDataset}
              disabled={currentDatasetLoading}
              className="w-full bg-white hover:bg-slate-50 text-[#1c1917] border border-[#d6cbbe] text-xs font-black py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-2xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>{currentDatasetLoading ? 'Scoring...' : 'Download Current Dataset Predictions'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
