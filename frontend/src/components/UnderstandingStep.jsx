import React, { useState } from 'react';
import { BarChart2, Table, AlertTriangle, Layers, Activity, FileText, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function UnderstandingStep({ data, onNext }) {
  if (!data) return null;
  const [activeTab, setActiveTab] = useState('columns');

  const {
    total_rows,
    total_cols,
    duplicate_rows,
    duplicate_pct,
    total_missing,
    overall_missing_pct,
    health_score,
    columns = [],
    head_preview = []
  } = data;

  const missingChartData = columns
    .filter(c => c.missing_count > 0)
    .map(c => ({ name: c.name, count: c.missing_count, pct: c.missing_pct }));

  return (
    <div className="space-y-6 py-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            1. Data Understanding & Quality Inspection
          </h2>
          <p className="text-xs text-gray-400">
            Statistical breakdown of data types, missing values, duplicates, and outlier occurrences.
          </p>
        </div>

        <button onClick={onNext} className="btn-primary">
          <span>Proceed to Auto Data Cleaning</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Health Score */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
          <div className="text-xs font-semibold text-gray-400 mb-1">Data Health Score</div>
          <div className={`text-2xl font-extrabold ${health_score >= 80 ? 'text-emerald-400' : health_score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
            {health_score}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${health_score >= 80 ? 'bg-emerald-500' : health_score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${health_score}%` }}
            />
          </div>
        </div>

        {/* Rows */}
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs font-semibold text-gray-400 mb-1">Total Rows</div>
          <div className="text-2xl font-extrabold text-white">{total_rows.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500 mt-1">Records in dataset</div>
        </div>

        {/* Columns */}
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs font-semibold text-gray-400 mb-1">Total Features</div>
          <div className="text-2xl font-extrabold text-indigo-400">{total_cols}</div>
          <div className="text-[10px] text-gray-500 mt-1">Columns loaded</div>
        </div>

        {/* Missing Values */}
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs font-semibold text-gray-400 mb-1">Missing Values</div>
          <div className={`text-2xl font-extrabold ${total_missing > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {total_missing.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">{overall_missing_pct}% overall missing</div>
        </div>

        {/* Duplicates */}
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs font-semibold text-gray-400 mb-1">Duplicate Rows</div>
          <div className={`text-2xl font-extrabold ${duplicate_rows > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {duplicate_rows}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">{duplicate_pct}% duplicate ratio</div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-white/10 gap-6">
        <button
          onClick={() => setActiveTab('columns')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'columns'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Column Profile & Datatypes ({columns.length})
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'preview'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Data Sample Preview (Head 10)
        </button>
      </div>

      {/* Tab 1: Column Profile */}
      {activeTab === 'columns' && (
        <div className="glass-panel overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-gray-400 border-b border-white/10 font-semibold uppercase tracking-wider">
                  <th className="p-3">Column Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Missing</th>
                  <th className="p-3">Unique</th>
                  <th className="p-3">Outliers</th>
                  <th className="p-3">Summary Stats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {columns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-semibold text-white font-mono">{col.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        col.type === 'numerical' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {col.type} ({col.raw_dtype})
                      </span>
                    </td>
                    <td className="p-3">
                      {col.missing_count > 0 ? (
                        <span className="text-amber-400 font-medium">{col.missing_count} ({col.missing_pct}%)</span>
                      ) : (
                        <span className="text-emerald-400">0 (0%)</span>
                      )}
                    </td>
                    <td className="p-3">{col.unique_count}</td>
                    <td className="p-3">
                      {col.outliers_count > 0 ? (
                        <span className="text-rose-400 font-medium">{col.outliers_count} IQR outliers</span>
                      ) : (
                        <span className="text-gray-500">0</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {col.type === 'numerical' ? (
                        <span>Min: {col.stats.min} | Max: {col.stats.max} | Mean: {col.stats.mean}</span>
                      ) : (
                        <span>Top: '{col.stats.top_category}' ({col.stats.top_frequency})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Sample Data Preview */}
      {activeTab === 'preview' && (
        <div className="glass-panel overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-gray-400 border-b border-white/10 font-semibold uppercase font-mono">
                  {columns.map((c, i) => (
                    <th key={i} className="p-3">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
                {head_preview.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02]">
                    {columns.map((c, cIdx) => (
                      <td key={cIdx} className="p-3 truncate max-w-[180px]">
                        {String(row[c.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
