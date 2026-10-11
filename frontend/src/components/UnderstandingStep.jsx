import React, { useState } from 'react';
import { BarChart2, Table, AlertTriangle, Layers, Activity, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function UnderstandingStep({ data, onNext }) {
  if (!data) return null;
  const [activeTab, setActiveTab] = useState('columns');

  const {
    total_rows = 0,
    total_cols = 0,
    duplicate_rows = 0,
    duplicate_pct = 0,
    total_missing = 0,
    overall_missing_pct = 0,
    health_score = 100,
    columns = [],
    head_preview = []
  } = data;

  return (
    <div className="space-y-6 py-2 animate-slide-up">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1c1917] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1c1917] text-white flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            1. Data Understanding & Quality Inspection
          </h2>
          <p className="text-xs font-bold text-[#57534e] mt-1">
            Statistical breakdown of data types, missing values, duplicates, and outlier occurrences.
          </p>
        </div>

        <button 
          onClick={onNext} 
          className="btn-primary cursor-pointer shadow-md text-xs py-2.5 px-6 font-extrabold flex items-center gap-2"
        >
          <span>Proceed to Auto Data Cleaning</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        
        {/* Health Score */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#e8dfd2] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-[#78716c] mb-1">Data Health Score</div>
            <div className={`text-2xl font-black ${health_score >= 80 ? 'text-emerald-700' : health_score >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>
              {health_score}%
            </div>
          </div>
          <div className="w-full bg-[#f3ede4] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${health_score >= 80 ? 'bg-emerald-500' : health_score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${health_score}%` }}
            />
          </div>
        </div>

        {/* Rows */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#e8dfd2] shadow-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-[#78716c] mb-1">Total Rows</div>
          <div className="text-2xl font-black text-[#1c1917]">{total_rows.toLocaleString()}</div>
          <div className="text-[11px] font-bold text-[#78716c] mt-1">Records in dataset</div>
        </div>

        {/* Columns */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#e8dfd2] shadow-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-[#78716c] mb-1">Total Features</div>
          <div className="text-2xl font-black text-[#1c1917]">{total_cols}</div>
          <div className="text-[11px] font-bold text-[#78716c] mt-1">Columns loaded</div>
        </div>

        {/* Missing Values */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#e8dfd2] shadow-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-[#78716c] mb-1">Missing Values</div>
          <div className={`text-2xl font-black ${total_missing > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {total_missing.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold text-[#78716c] mt-1">{overall_missing_pct}% overall missing</div>
        </div>

        {/* Duplicates */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#e8dfd2] shadow-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-[#78716c] mb-1">Duplicate Rows</div>
          <div className={`text-2xl font-black ${duplicate_rows > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {duplicate_rows}
          </div>
          <div className="text-[11px] font-bold text-[#78716c] mt-1">{duplicate_pct}% duplicate ratio</div>
        </div>

      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#e8dfd2] gap-6 pt-1">
        <button
          onClick={() => setActiveTab('columns')}
          className={`pb-3 text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'columns'
              ? 'border-[#1c1917] text-[#1c1917]'
              : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Column Profile & Datatypes ({columns.length})
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`pb-3 text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'preview'
              ? 'border-[#1c1917] text-[#1c1917]'
              : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
          }`}
        >
          <Table className="w-4 h-4" />
          Data Sample Preview (Head 10)
        </button>
      </div>

      {/* Tab 1: Column Profile */}
      {activeTab === 'columns' && (
        <div className="bg-white overflow-hidden rounded-2xl border border-[#e8dfd2] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1c1917] text-white border-b border-[#1c1917] font-black uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Column Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Missing</th>
                  <th className="p-3.5">Unique</th>
                  <th className="p-3.5">Outliers</th>
                  <th className="p-3.5">Summary Stats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e8dc] text-[#1c1917]">
                {columns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-[#fbf8f3] transition-colors">
                    <td className="p-3.5 font-black text-[#1c1917] font-mono text-xs">
                      {col.name}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        col.type === 'numerical' 
                          ? 'bg-[#e0e7ff] text-[#3730a3] border border-[#c7d2fe]' 
                          : 'bg-[#fae8ff] text-[#86198f] border border-[#f5d0fe]'
                      }`}>
                        {col.type} ({col.raw_dtype})
                      </span>
                    </td>
                    <td className="p-3.5 font-bold">
                      {col.missing_count > 0 ? (
                        <span className="text-amber-800 bg-[#fef3c7] px-2 py-0.5 rounded-full border border-[#fde68a] font-extrabold">
                          {col.missing_count} ({col.missing_pct}%)
                        </span>
                      ) : (
                        <span className="text-emerald-800 bg-[#d1fae5] px-2 py-0.5 rounded-full border border-[#a7f3d0] font-extrabold">
                          0 (0%)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-black text-[#1c1917]">
                      {col.unique_count}
                    </td>
                    <td className="p-3.5 font-bold">
                      {col.outliers_count > 0 ? (
                        <span className="text-rose-800 bg-[#ffe4e6] px-2 py-0.5 rounded-full border border-[#fecdd3] font-extrabold">
                          {col.outliers_count} IQR
                        </span>
                      ) : (
                        <span className="text-[#78716c]">0</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] font-bold text-[#1c1917]">
                      {col.type === 'numerical' ? (
                        <span>Min: {col.stats.min} | Max: {col.stats.max} | Mean: {col.stats.mean}</span>
                      ) : (
                        <span>Top: &apos;{col.stats.top_category}&apos; ({col.stats.top_frequency})</span>
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
        <div className="bg-white overflow-hidden rounded-2xl border border-[#e8dfd2] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1c1917] text-white border-b border-[#1c1917] font-black uppercase font-mono text-[11px] tracking-wider">
                  {columns.map((c, i) => (
                    <th key={i} className="p-3.5 whitespace-nowrap">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e8dc] font-mono text-xs text-[#1c1917]">
                {head_preview.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#fbf8f3] transition-colors">
                    {columns.map((c, cIdx) => (
                      <td key={cIdx} className="p-3.5 truncate max-w-[200px] font-bold">
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
