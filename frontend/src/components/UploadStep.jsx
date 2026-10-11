import React, { useState } from 'react';
import { UploadCloud, Sparkles, ArrowRight, Zap, CheckCircle, BrainCircuit } from 'lucide-react';
import axios from 'axios';

export default function UploadStep({ onUploadSuccess, backendUrl }) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${backendUrl}/api/upload`, formData);
      onUploadSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to parse file. Please verify CSV/XLSX structure.");
    } finally {
      setLoading(false);
    }
  };

  const handleSampleLoad = async (sampleName) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('sample_name', sampleName);

    try {
      const res = await axios.post(`${backendUrl}/api/load_sample`, formData);
      onUploadSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load sample dataset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 animate-slide-up relative">
      {/* Playful Floating Badges */}
      <div className="hidden lg:block absolute -top-2 left-8 pill-badge pill-lime animate-float shadow-xl z-10">
        <CheckCircle className="w-3.5 h-3.5 fill-black stroke-lime-400" />
        Auto ETL Data Cleaning Engine
      </div>
      <div className="hidden lg:block absolute top-6 right-8 pill-badge pill-cyan animate-float shadow-xl z-10" style={{ animationDelay: '1.5s' }}>
        <Sparkles className="w-3.5 h-3.5 text-black" />
        🏆 Auto-Selects Best ML Algorithm
      </div>

      {/* Hero Header */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-white/15 text-indigo-300 text-xs font-bold shadow-xl animate-pulse">
          <Zap className="w-4 h-4 text-lime-400 fill-lime-400" />
          Autonomous Predictive Intelligence & Model Builder
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          Welcome to <span className="gradient-text font-black">ML DataSage AI</span>
        </h2>
        <p className="text-gray-300 text-sm max-w-2xl mx-auto font-semibold">
          Upload any <code className="text-lime-300 font-mono">.csv</code> or <code className="text-lime-300 font-mono">.xlsx</code> file. ML DataSage AI automatically executes complete data cleaning, outlier winsorization, problem detection, model training & evaluation, and answers all your data questions.
        </p>
      </div>

      {/* Upload Drag & Drop Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
          }
        }}
        className={`glass-panel p-12 border-2 border-dashed transition-all text-center rounded-3xl cursor-pointer ${
          dragOver ? 'border-lime-400 bg-indigo-500/10 scale-[1.01]' : 'border-white/20 hover:border-indigo-400'
        }`}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          id="file-upload"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />
        <label htmlFor="file-upload" className="cursor-pointer block space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-lime-400 p-0.5 shadow-2xl shadow-indigo-500/30 mx-auto">
            <div className="w-full h-full bg-[#0d1322] rounded-[22px] flex items-center justify-center text-lime-400">
              <UploadCloud className="w-10 h-10 animate-bounce" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">
              Drop your CSV or Excel file here, or <span className="text-lime-300 underline">browse</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1.5 font-semibold">Supports CSV, XLSX • Automatic Column Datatypes, Missing Values & Outlier Detection</p>
          </div>
        </label>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm text-center font-bold animate-slide-up">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-6 text-lime-300 text-sm font-extrabold animate-pulse">
          <div className="w-6 h-6 border-3 border-lime-400 border-t-transparent rounded-full animate-spin" />
          ML DataSage AI is profiling dataset structure & features...
        </div>
      )}

      {/* 1-Click Sample Datasets */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Or Test Instantly with 1-Click Sample Datasets:
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Sample 1: Telecom Churn */}
          <div
            onClick={() => handleSampleLoad('telecom_churn')}
            className="glass-panel p-6 cursor-pointer hover:border-indigo-400 hover:-translate-y-1.5 transition-all group rounded-3xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="pill-badge pill-cyan">
                Classification
              </span>
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-lime-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h4 className="font-extrabold text-white text-base">Telecom Customer Churn</h4>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">1,000 rows • Predict customer attrition based on tenure, contract & monthly charges.</p>
          </div>

          {/* Sample 2: Housing Prices */}
          <div
            onClick={() => handleSampleLoad('housing_prices')}
            className="glass-panel p-6 cursor-pointer hover:border-indigo-400 hover:-translate-y-1.5 transition-all group rounded-3xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="pill-badge pill-purple">
                Regression
              </span>
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-lime-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h4 className="font-extrabold text-white text-base">Housing Price Prediction</h4>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">1,000 rows • Estimate property valuation using sqft, bedrooms, year built & location.</p>
          </div>

          {/* Sample 3: Customer Segments */}
          <div
            onClick={() => handleSampleLoad('customer_segmentation')}
            className="glass-panel p-6 cursor-pointer hover:border-indigo-400 hover:-translate-y-1.5 transition-all group rounded-3xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="pill-badge pill-lime">
                Clustering
              </span>
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-lime-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h4 className="font-extrabold text-white text-base">Customer Segmentation</h4>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">800 rows • Unsupervised grouping based on income, spending score & loyalty years.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
