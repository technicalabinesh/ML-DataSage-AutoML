import React, { useState } from 'react';
import { Sparkles, Key, CheckCircle2, Bot, BrainCircuit, Wand2 } from 'lucide-react';

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & Balanced)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Recommended)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (High Performance)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Reasoning)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Legacy Fast)' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' }
];

export default function Header({
  activeStep,
  setActiveStep,
  selectedModel,
  setSelectedModel,
  apiKey,
  setApiKey,
  filename
}) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const steps = [
    { id: 1, label: "1. Data Understanding" },
    { id: 2, label: "2. Auto Cleaning" },
    { id: 3, label: "3. Problem Detection" },
    { id: 4, label: "4. Model Selection" },
    { id: 5, label: "5. Train & Evaluate" },
    { id: 6, label: "6. Prediction UI" },
    { id: 7, label: "7. AI Chat Analyst" }
  ];

  const handleSaveKey = () => {
    setApiKey(tempKey);
    setShowKeyModal(false);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#070a12]/90 border-b border-white/10 px-6 py-4 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3.5 group cursor-pointer" onClick={() => setActiveStep(0)}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-lime-400 p-0.5 shadow-2xl shadow-indigo-500/40 group-hover:scale-105 transition-all">
            <div className="w-full h-full bg-[#0b0f19] rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <BrainCircuit className="w-6 h-6 text-lime-400 animate-pulse" />
              <div className="absolute inset-0 bg-lime-400/10 animate-ping rounded-full pointer-events-none" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              ML DataSage <span className="gradient-text font-black">AI</span>
            </h1>
            <p className="text-xs text-gray-400 font-medium flex items-center gap-2">
              <span>Autonomous Data ETL & Predictive Intelligence</span>
              {filename && (
                <span className="pill-badge pill-purple text-[10px] py-0.5 px-2.5 shadow-md">
                  📄 {filename}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Gemini Model & API Key Configuration */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-white/15 rounded-full px-4 py-2 text-xs text-gray-300 shadow-lg hover:border-indigo-400 transition-all">
            <Bot className="w-4 h-4 text-cyan-400 animate-bounce" />
            <span className="hidden sm:inline font-bold">LLM:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-indigo-300 font-bold focus:outline-none cursor-pointer"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-gray-200">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowKeyModal(true)}
            className={`pill-badge cursor-pointer transition-all ${
              apiKey
                ? 'pill-lime'
                : 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/50 hover:scale-105'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? 'API Key Active' : 'Set Gemini Key'}</span>
            {apiKey && <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Stepper Timeline Navigation */}
      <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-white/10 overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between min-w-[900px] gap-2">
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            const isPassed = activeStep > step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-indigo-600/40 scale-105 border border-lime-400/40'
                    : isPassed
                    ? 'text-gray-300 hover:text-white bg-slate-900/60 border border-white/10 hover:scale-102'
                    : 'text-gray-500 hover:text-gray-300 bg-slate-900/30 border border-transparent'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isActive
                      ? 'bg-lime-400 text-black shadow-md'
                      : isPassed
                      ? 'bg-indigo-900/80 text-indigo-300'
                      : 'bg-slate-800 text-gray-500'
                  }`}
                >
                  {step.id}
                </div>
                <span>{step.label.replace(/^\d+\.\s*/, '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-slide-up">
          <div className="glass-panel p-8 max-w-md w-full border border-white/20 rounded-3xl shadow-2xl space-y-5">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-lime-400 animate-bounce" />
              Configure Gemini API Key
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed font-medium">
              Enter your Google Gemini API key to enable direct cloud LLM chat reasoning in <strong>ML DataSage AI</strong>. If left empty, the application seamlessly uses the built-in Statistical AI Engine fallback.
            </p>

            <input
              type="password"
              placeholder="AIzaSy..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="input-field my-2"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="btn-secondary text-xs py-2.5 px-5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKey}
                className="btn-primary text-xs py-2.5 px-6"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
