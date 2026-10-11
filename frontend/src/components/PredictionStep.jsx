import React, { useState, useEffect } from 'react';
import { Play, UploadCloud, Download, Sparkles, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';
import axios from 'axios';

export default function PredictionStep({ sessionId, datasetColumns = [], targetCol, problemType, backendUrl, onPredictionMade }) {
  const [formValues, setFormValues] = useState({});
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Batch prediction state
  const [batchFile, setBatchFile] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const featureCols = datasetColumns.filter(c => c.name !== targetCol);

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
    e.preventDefault();
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
      setError(err.response?.data?.detail || "Prediction request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchPredict = async () => {
    if (!batchFile) return;
    setBatchLoading(true);
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', batchFile);

    try {
      const res = await axios.post(`${backendUrl}/api/predict_batch`, formData, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Predicted_${batchFile.name}`;
      a.click();
    } catch (err) {
      setError("Batch prediction failed. Check CSV format.");
    } finally {
      setBatchLoading(false);
    }
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
            Enter custom feature values for single record prediction or run batch CSV inference.
          </p>
        </div>
      </div>

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
              {featureCols.map((c) => (
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
              ))}
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
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#78716c] font-bold">
                Enter feature values and click &quot;Generate Prediction&quot; to see AI inference output.
              </div>
            )}
          </div>

          {/* Batch CSV Prediction Card */}
          <div className="bg-white p-6 rounded-3xl space-y-3 border border-[#e8dfd2] shadow-sm">
            <h4 className="text-xs font-black text-[#1c1917] uppercase tracking-wider flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Batch CSV Inference Download
            </h4>
            <p className="text-[11px] text-[#57534e] font-bold">
              Upload un-labeled CSV file to automatically append predicted outputs.
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && setBatchFile(e.target.files[0])}
              className="text-xs text-[#1c1917] file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-[#1c1917] file:text-white cursor-pointer w-full"
            />

            <button
              onClick={handleBatchPredict}
              disabled={!batchFile || batchLoading}
              className="btn-secondary w-full text-xs py-2.5 justify-center rounded-full cursor-pointer font-black"
            >
              {batchLoading ? 'Generating Batch CSV...' : 'Download Predicted CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
