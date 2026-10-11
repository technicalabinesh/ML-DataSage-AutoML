import React, { useState } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  FileText, 
  Trash2, 
  Plus, 
  Layers, 
  X,
  Database,
  Laptop,
  Briefcase,
  PlaySquare,
  Box,
  Star,
  Award,
  Download
} from 'lucide-react';
import axios from 'axios';

export default function UploadStep({ 
  onUploadSuccess, 
  backendUrl, 
  currentFilename, 
  currentRows, 
  currentCols, 
  onResetDataset 
}) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stagedFiles, setStagedFiles] = useState([]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFilesSelected = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles = Array.from(fileList);
    setStagedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const filtered = newFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...filtered];
    });
    setError(null);
  };

  const removeStagedFile = (index) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async (merge = true) => {
    if (stagedFiles.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      if (stagedFiles.length === 1) {
        const formData = new FormData();
        formData.append('file', stagedFiles[0]);
        const res = await axios.post(`${backendUrl}/api/upload`, formData);
        onUploadSuccess(res.data);
      } else {
        const formData = new FormData();
        stagedFiles.forEach(file => {
          formData.append('files', file);
        });
        formData.append('merge', merge ? 'true' : 'false');
        const res = await axios.post(`${backendUrl}/api/upload_multiple`, formData);
        onUploadSuccess(res.data);
      }
      setStagedFiles([]);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to parse files. Please verify CSV/XLSX structure.");
    } finally {
      setLoading(false);
    }
  };

  const handleSampleLoad = async (sampleName) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Try loading via backend load_sample endpoint
      const formData = new FormData();
      formData.append('sample_name', sampleName);
      const res = await axios.post(`${backendUrl}/api/load_sample`, formData);
      onUploadSuccess(res.data);
    } catch (err) {
      console.warn("Backend load_sample endpoint failed, attempting direct CSV fetch & upload fallback:", err);
      try {
        // Fallback: fetch CSV file from public static assets and send to upload endpoint
        const fileRes = await axios.get(`/samples/${sampleName}.csv`, { responseType: 'blob' });
        const uploadForm = new FormData();
        uploadForm.append('file', fileRes.data, `${sampleName}.csv`);
        const res2 = await axios.post(`${backendUrl}/api/upload`, uploadForm);
        onUploadSuccess(res2.data);
      } catch (err2) {
        setError(err.response?.data?.detail || err2.response?.data?.detail || "Failed to load sample dataset. Please check backend connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-slide-up pb-4">
      
      {/* Active Dataset Alert (if dataset loaded) */}
      {currentFilename && (
        <div className="bg-[#f6eee3] p-5 rounded-[28px] border border-[#e8dfd2] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Loaded Dataset</div>
              <div className="text-base font-extrabold text-[#1c1917] flex items-center gap-2">
                <span>{currentFilename}</span>
                {currentRows && (
                  <span className="text-xs bg-white text-gray-700 px-2.5 py-0.5 rounded-full font-bold border border-gray-200">
                    {currentRows} rows • {currentCols || 0} features
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onResetDataset}
            className="px-4 py-2 rounded-full bg-[#ffd2cc] text-[#991b1b] hover:bg-[#ffb6ad] text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Dataset & Start Fresh</span>
          </button>
        </div>
      )}

      {/* Upload Drag & Drop Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFilesSelected(e.dataTransfer.files);
          }
        }}
        className={`bg-white p-8 md:p-10 border-2 border-dashed transition-all text-center rounded-[32px] cursor-pointer shadow-sm ${
          dragOver ? 'border-black bg-[#fbf8f3] scale-[1.01]' : 'border-[#e2d7c8] hover:border-black'
        }`}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          id="file-upload"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
        />
        <label htmlFor="file-upload" className="cursor-pointer block space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#1c1917] text-white flex items-center justify-center mx-auto shadow-md">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-[#1c1917]">
              Drop one or multiple CSV / Excel files here, or <span className="underline decoration-2 underline-offset-4">browse</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-semibold">
              Select multiple datasets at once • Auto-concatenation, schema detection & instant data profiling
            </p>
          </div>
        </label>
      </div>

      {/* Staged Multi-Files Tray (if files selected) */}
      {stagedFiles.length > 0 && (
        <div className="bg-[#f6eee3] p-6 rounded-[28px] border border-[#e8dfd2] space-y-4 animate-slide-up shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e5dacf] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1c1917]" />
              <h3 className="text-sm font-extrabold text-[#1c1917]">
                Staged Datasets Ready for Ingestion ({stagedFiles.length})
              </h3>
            </div>
            <button
              onClick={() => setStagedFiles([])}
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1 font-bold"
            >
              <X className="w-3.5 h-3.5" />
              Clear Selection
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {stagedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#e8dfd2] text-xs shadow-xs"
              >
                <div className="flex items-center gap-2.5 truncate mr-2">
                  <FileText className="w-4 h-4 text-[#1c1917] shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-[#1c1917] truncate">{file.name}</div>
                    <div className="text-[10px] text-gray-400">{formatSize(file.size)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeStagedFile(idx)}
                  className="w-5 h-5 rounded-full bg-gray-100 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#e5dacf]">
            <label
              htmlFor="file-upload"
              className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-white text-gray-800 hover:bg-gray-50 border border-gray-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another File</span>
            </label>

            {stagedFiles.length > 1 ? (
              <>
                <button
                  onClick={() => handleUploadSubmit(false)}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-white text-[#1c1917] hover:bg-gray-100 border border-gray-300 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Upload Separately (Switch Anytime)</span>
                </button>

                <button
                  onClick={() => handleUploadSubmit(true)}
                  disabled={loading}
                  className="w-full sm:w-auto btn-primary text-xs py-2.5 px-6 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Merge & Combine All {stagedFiles.length} Datasets</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleUploadSubmit(false)}
                disabled={loading}
                className="w-full sm:w-auto btn-primary text-xs py-2.5 px-6 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upload & Analyze Dataset</span>
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#ffd2cc] text-[#991b1b] text-xs font-bold text-center">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-4 text-xs font-extrabold text-[#1c1917]">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          Profiling dataset schema & feature distributions...
        </div>
      )}

      {/* Bento Grid: 4 Pastel Preset Cards Exactly Matching Reference Image */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-extrabold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
          <span>Most popular</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Coral / Salmon */}
          <div
            onClick={() => handleSampleLoad('telecom_churn')}
            className="card-coral p-6 cursor-pointer flex flex-col justify-between min-h-[200px] shadow-sm relative group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 text-gray-800 shadow-2xs">
                  <Laptop className="w-3.5 h-3.5 text-gray-700" />
                  Classification
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href="/samples/telecom_churn.csv"
                    download="telecom_churn.csv"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white/90 hover:bg-white px-2.5 py-1 rounded-full text-[11px] font-black text-[#1c1917] flex items-center gap-1 shadow-2xs transition-all border border-black/10 cursor-pointer"
                    title="Download raw telecom_churn.csv"
                  >
                    <Download className="w-3 h-3 text-[#1c1917]" />
                    <span>CSV</span>
                  </a>
                  <span className="bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-extrabold text-amber-700 flex items-center gap-1 shadow-2xs">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    4.8
                  </span>
                </div>
              </div>
              <h4 className="text-xl font-black text-[#1c1917] leading-snug group-hover:text-black">
                Telecom 2026 Customer Churn Classification
              </h4>
              <p className="text-xs font-bold text-[#44403c] mt-1">
                Predict churn risk with LightGBM, XGBoost & CatBoost
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 text-xs text-[#1c1917] font-bold">
              <span>1,000 rows • 9 features</span>
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#ffd2cc] bg-purple-500 flex items-center justify-center text-[10px] text-white font-black">TC</div>
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#ffd2cc] bg-amber-500 flex items-center justify-center text-[10px] text-white font-black">ML</div>
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#ffd2cc] bg-emerald-500 flex items-center justify-center text-[10px] text-white font-black">AI</div>
              </div>
            </div>
          </div>

          {/* Card 2: Peach / Apricot */}
          <div
            onClick={() => handleSampleLoad('housing_prices')}
            className="card-peach p-6 cursor-pointer flex flex-col justify-between min-h-[200px] shadow-sm relative group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 text-gray-800 shadow-2xs">
                  <Briefcase className="w-3.5 h-3.5 text-gray-700" />
                  Regression
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href="/samples/housing_prices.csv"
                    download="housing_prices.csv"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white/90 hover:bg-white px-2.5 py-1 rounded-full text-[11px] font-black text-[#1c1917] flex items-center gap-1 shadow-2xs transition-all border border-black/10 cursor-pointer"
                    title="Download raw housing_prices.csv"
                  >
                    <Download className="w-3 h-3 text-[#1c1917]" />
                    <span>CSV</span>
                  </a>
                  <span className="bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-extrabold text-amber-700 flex items-center gap-1 shadow-2xs">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    4.9
                  </span>
                </div>
              </div>
              <h4 className="text-xl font-black text-[#1c1917] leading-snug group-hover:text-black">
                Powerful Valuation: Housing Price Regression
              </h4>
              <p className="text-xs font-bold text-[#44403c] mt-1">
                Continuous price modeling via Random Forest & Ridge
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 text-xs text-[#1c1917] font-bold">
              <span>1,005 rows • 9 features</span>
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#ffe4c7] bg-blue-500 flex items-center justify-center text-[10px] text-white font-black">HP</div>
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#ffe4c7] bg-rose-500 flex items-center justify-center text-[10px] text-white font-black">RE</div>
              </div>
            </div>
          </div>

          {/* Card 3: Lavender / Lilac */}
          <div
            onClick={() => handleSampleLoad('customer_segmentation')}
            className="card-lavender p-6 cursor-pointer flex flex-col justify-between min-h-[200px] shadow-sm relative group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 text-gray-800 shadow-2xs">
                  <PlaySquare className="w-3.5 h-3.5 text-gray-700" />
                  Clustering
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href="/samples/customer_segmentation.csv"
                    download="customer_segmentation.csv"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white/90 hover:bg-white px-2.5 py-1 rounded-full text-[11px] font-black text-[#1c1917] flex items-center gap-1 shadow-2xs transition-all border border-black/10 cursor-pointer"
                    title="Download raw customer_segmentation.csv"
                  >
                    <Download className="w-3 h-3 text-[#1c1917]" />
                    <span>CSV</span>
                  </a>
                  <span className="bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-extrabold text-amber-700 flex items-center gap-1 shadow-2xs">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    4.9
                  </span>
                </div>
              </div>
              <h4 className="text-xl font-black text-[#1c1917] leading-snug group-hover:text-black">
                Customer Segmentation: Unsupervised Clustering
              </h4>
              <p className="text-xs font-bold text-[#44403c] mt-1">
                K-Means & PCA segmentation on income and spend
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 text-xs text-[#1c1917] font-bold">
              <span>800 rows • 5 features</span>
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#ded8fd] bg-teal-500 flex items-center justify-center text-[10px] text-white font-black">CS</div>
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#ded8fd] bg-orange-500 flex items-center justify-center text-[10px] text-white font-black">KM</div>
              </div>
            </div>
          </div>

          {/* Card 4: Mint / Sage */}
          <div
            onClick={() => document.getElementById('file-upload')?.click()}
            className="card-mint p-6 cursor-pointer flex flex-col justify-between min-h-[190px] shadow-sm relative group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 text-gray-800 shadow-2xs">
                  <Box className="w-3.5 h-3.5 text-gray-700" />
                  Multi-Dataset
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-[11px] font-extrabold text-amber-700 flex items-center gap-0.5 shadow-2xs">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    5.0
                  </span>
                  <span className="bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-[11px] font-extrabold text-amber-700 flex items-center gap-0.5 shadow-2xs">
                    <Award className="w-3 h-3 text-amber-600" />
                    Top 10
                  </span>
                </div>
              </div>
              <h4 className="text-xl font-extrabold text-[#1c1917] leading-snug group-hover:text-black">
                Upload & Merge Multiple Custom Datasets
              </h4>
            </div>

            <div className="flex items-center justify-between pt-4 text-xs text-gray-600 font-medium">
              <span>Unlimited files • One-Click Schema Join</span>
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#c8f2da] bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">AI</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
