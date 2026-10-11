import React, { useState } from 'react';
import axios from 'axios';
import { 
  Home, 
  BarChart2, 
  Wand2, 
  Target, 
  Cpu, 
  Crosshair, 
  Bot, 
  Settings, 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Share2, 
  Download, 
  Plus, 
  Star, 
  CheckCircle2, 
  Users, 
  Laptop, 
  Briefcase, 
  PlaySquare, 
  Box, 
  Layers,
  Key,
  Database,
  Trash2
} from 'lucide-react';

import UploadStep from './components/UploadStep';
import UnderstandingStep from './components/UnderstandingStep';
import CleaningStep from './components/CleaningStep';
import ProblemStep from './components/ProblemStep';
import TrainingStep from './components/TrainingStep';
import PredictionStep from './components/PredictionStep';
import AIChatStep from './components/AIChatStep';

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const BACKEND_URL = (rawBackendUrl && !rawBackendUrl.startsWith('http://') && !rawBackendUrl.startsWith('https://'))
  ? `https://${rawBackendUrl}`
  : rawBackendUrl;

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & Balanced)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Recommended)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (High Performance)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Reasoning)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Legacy Fast)' }
];

export default function App() {
  const [activeStep, setActiveStep] = useState(0); // 0 = Upload, 1 = Understand, 2 = Clean, 3 = Problem, 4 = Train, 6 = Predict, 7 = Chat
  const [sessionId, setSessionId] = useState(null);
  const [filename, setFilename] = useState('');
  const [availableDatasets, setAvailableDatasets] = useState([]);
  
  // Pipeline States
  const [understandingData, setUnderstandingData] = useState(null);
  const [cleaningReport, setCleaningReport] = useState(null);
  const [problemInfo, setProblemInfo] = useState(null);
  const [trainingResults, setTrainingResults] = useState(null);
  const [lastPrediction, setLastPrediction] = useState(null);

  // Config States
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const handleUploadSuccess = (data) => {
    setSessionId(data.session_id);
    setFilename(data.filename);
    setUnderstandingData(data.understanding);
    setAvailableDatasets(data.available_datasets || [data.filename]);
    setCleaningReport(null);
    setProblemInfo(null);
    setTrainingResults(null);
    setLastPrediction(null);
    setActiveStep(1); // Jump to Data Understanding
  };

  const handleCleanSuccess = (data) => {
    setCleaningReport(data.report);
    setUnderstandingData(data.understanding);
    setActiveStep(3); // Jump to Problem Detection
  };

  const handleProblemConfirmed = (data) => {
    setProblemInfo(data);
  };

  const handleTrainSuccess = (data) => {
    setTrainingResults(data);
  };

  const handlePredictionMade = (data) => {
    setLastPrediction(data);
  };

  const handleResetDataset = async () => {
    if (sessionId) {
      try {
        const formData = new FormData();
        formData.append('session_id', sessionId);
        await axios.post(`${BACKEND_URL}/api/reset_session`, formData);
      } catch (e) {
        console.warn("Session reset network warning:", e);
      }
    }
    setSessionId(null);
    setFilename('');
    setAvailableDatasets([]);
    setUnderstandingData(null);
    setCleaningReport(null);
    setProblemInfo(null);
    setTrainingResults(null);
    setLastPrediction(null);
    setActiveStep(0);
  };

  const handleSwitchDataset = async (targetFilename) => {
    if (!sessionId || !targetFilename) return;
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('filename', targetFilename);
      const res = await axios.post(`${BACKEND_URL}/api/switch_dataset`, formData);
      
      setFilename(res.data.filename);
      setUnderstandingData(res.data.understanding);
      setAvailableDatasets(res.data.available_datasets || []);
      setCleaningReport(null);
      setProblemInfo(null);
      setTrainingResults(null);
      setLastPrediction(null);
      setActiveStep(1);
    } catch (err) {
      console.error("Failed to switch dataset:", err);
    }
  };

  // Nav item list for Left Rail
  const navItems = [
    { step: 0, icon: Home, label: "Upload Hub" },
    { step: 1, icon: BarChart2, label: "Data Profiling" },
    { step: 2, icon: Wand2, label: "Auto Cleaning" },
    { step: 3, icon: Target, label: "Problem Detection" },
    { step: 4, icon: Cpu, label: "Model Training" },
    { step: 6, icon: Crosshair, label: "Prediction UI" },
    { step: 7, icon: Bot, label: "AI Chat Analyst" },
  ];

  // Filter Pills row for Center Canvas
  const filterPills = [
    { step: 0, label: "All Datasets", icon: Layers },
    { step: 1, label: "1. Profiling", icon: Laptop },
    { step: 2, label: "2. Cleaning", icon: Wand2 },
    { step: 3, label: "3. Target Detect", icon: Target },
    { step: 4, label: "4. Training", icon: Cpu },
    { step: 6, label: "5. Prediction", icon: Crosshair },
    { step: 7, label: "6. AI Analyst", icon: Bot },
  ];

  // Headings based on active step
  const getStepTitle = () => {
    switch (activeStep) {
      case 0: return "Invest in your models";
      case 1: return "Understand your dataset";
      case 2: return "Clean & preprocess features";
      case 3: return "Detect problem & target";
      case 4: return "Train & benchmark models";
      case 5: return "Model leaderboard evaluation";
      case 6: return "Live predictive inference";
      case 7: return "Chat with AI data analyst";
      default: return "Invest in your models";
    }
  };

  return (
    <div className="min-h-screen bg-[#bce8db] p-3 sm:p-5 md:p-8 flex items-center justify-center font-sans">
      
      {/* Outer macOS Desktop Canvas Window */}
      <div className="max-w-[1580px] w-full min-h-[92vh] bg-[#fdfbf7] rounded-[36px] shadow-2xl overflow-hidden border border-white/60 flex flex-col">
        
        {/* Top Browser Title Bar */}
        <div className="bg-[#fdfbf7] px-5 py-3 border-b border-[#ece4d8] flex items-center justify-between text-xs text-gray-500">
          
          {/* Traffic Lights & History Nav */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-gray-400">
              <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-black" />
              <ChevronRight className="w-4 h-4 cursor-pointer hover:text-black" />
            </div>
          </div>

          {/* Center Address Pill */}
          <div className="bg-[#f3ece2] px-6 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-gray-700 shadow-2xs">
            <Lock className="w-3 h-3 text-gray-500" />
            <span>ml-datasage.ai • AutoML Analyst Studio</span>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3 text-gray-400">
            <Share2 className="w-4 h-4 cursor-pointer hover:text-black" />
            <Download className="w-4 h-4 cursor-pointer hover:text-black" />
            <Plus className="w-4 h-4 cursor-pointer hover:text-black" />
          </div>
        </div>

        {/* 3-Column Interior Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-3 md:p-4 gap-4">
          
          {/* Column 1: Left Slim Icon Navigation Rail */}
          <div className="w-full md:w-18 bg-[#f6eee3] rounded-[28px] p-3 flex md:flex-col items-center justify-between border border-[#ece4d8] shrink-0">
            
            {/* Top Brand Glyph */}
            <div 
              onClick={() => setActiveStep(0)}
              className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center font-black text-lg cursor-pointer shadow-md hover:scale-105 transition-all"
              title="ML DataSage AI"
            >
              <span className="text-lime-300 font-extrabold text-xl">⚡</span>
            </div>

            {/* Vertical Icons List */}
            <div className="flex md:flex-col items-center gap-2.5 my-2">
              {navItems.map((item) => {
                const isActive = activeStep === item.step;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.step}
                    onClick={() => setActiveStep(item.step)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-black text-white shadow-lg scale-105'
                        : 'bg-transparent text-gray-600 hover:bg-white hover:text-black'
                    }`}
                    title={item.label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions: Settings & Avatar */}
            <div className="flex md:flex-col items-center gap-2.5">
              <button
                onClick={() => setShowKeyModal(true)}
                className="w-10 h-10 rounded-full bg-white text-gray-700 hover:text-black flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                title="Configure Google Gemini API Key"
              >
                <Settings className="w-4 h-4" />
              </button>

              <div 
                className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white cursor-pointer shadow-md flex items-center justify-center text-xs font-bold text-white bg-gradient-to-tr from-purple-400 via-pink-400 to-amber-300"
                title="Active Profile: Data Science Studio"
              >
                <span className="text-black font-extrabold">DS</span>
              </div>
            </div>
          </div>

          {/* Column 2: Center Main Content Area */}
          <div className="flex-1 bg-[#fdfbf7] rounded-[28px] p-4 md:p-6 overflow-y-auto flex flex-col justify-between">
            
            <div className="space-y-6">
              
              {/* Headline */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-3xl md:text-5xl font-black text-[#1c1917] tracking-tight">
                  {getStepTitle()}
                </h1>

                {/* Active Dataset Pill if loaded */}
                {filename && (
                  <div className="flex items-center gap-1.5 bg-[#f6eee3] border border-[#e8dfd2] rounded-full px-3 py-1 text-xs self-start sm:self-auto shadow-2xs">
                    <Database className="w-3.5 h-3.5 text-black" />
                    {availableDatasets.length > 1 ? (
                      <select
                        value={filename}
                        onChange={(e) => handleSwitchDataset(e.target.value)}
                        className="bg-transparent text-black font-bold focus:outline-none cursor-pointer max-w-[140px] truncate"
                      >
                        {availableDatasets.map((d, i) => (
                          <option key={i} value={d} className="bg-white text-black">{d}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-black font-bold max-w-[150px] truncate">{filename}</span>
                    )}
                    <button
                      onClick={handleResetDataset}
                      className="ml-1 w-5 h-5 rounded-full bg-[#ffd2cc] text-[#991b1b] hover:bg-[#ffb6ad] flex items-center justify-center cursor-pointer transition-all"
                      title="Remove current dataset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Filter Pills row across the top */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {filterPills.map((pill) => {
                  const isActive = activeStep === pill.step;
                  const Icon = pill.icon;
                  return (
                    <button
                      key={pill.step}
                      onClick={() => setActiveStep(pill.step)}
                      className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#1c1917] text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-[#f6eee3] border border-[#e8dfd2]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{pill.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Step Content Canvas */}
              <div className="pt-2">
                {activeStep === 0 && (
                  <UploadStep 
                    onUploadSuccess={handleUploadSuccess} 
                    backendUrl={BACKEND_URL}
                    currentFilename={filename}
                    currentRows={understandingData?.total_rows}
                    currentCols={understandingData?.total_cols}
                    onResetDataset={handleResetDataset}
                  />
                )}

                {activeStep === 1 && (
                  <UnderstandingStep
                    data={understandingData}
                    onNext={() => setActiveStep(2)}
                  />
                )}

                {activeStep === 2 && (
                  <CleaningStep
                    sessionId={sessionId}
                    backendUrl={BACKEND_URL}
                    datasetColumns={understandingData?.columns?.map(c => c.name) || []}
                    onCleanSuccess={handleCleanSuccess}
                  />
                )}

                {activeStep === 3 && (
                  <div className="space-y-6">
                    <ProblemStep
                      sessionId={sessionId}
                      backendUrl={BACKEND_URL}
                      datasetColumns={understandingData?.columns?.map(c => c.name) || []}
                      onProblemConfirmed={handleProblemConfirmed}
                    />
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => setActiveStep(4)}
                        className="btn-primary"
                      >
                        Proceed to Model Selection & Training 🚀
                      </button>
                    </div>
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="space-y-6">
                    <TrainingStep
                      sessionId={sessionId}
                      targetCol={problemInfo?.suggested_target}
                      problemType={problemInfo?.problem_type}
                      backendUrl={BACKEND_URL}
                      onTrainSuccess={handleTrainSuccess}
                    />
                    {trainingResults && (
                      <div className="flex justify-end pt-4 gap-3">
                        <button onClick={() => setActiveStep(6)} className="btn-primary">
                          Go to Prediction UI 🎯
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeStep === 6 && (
                  <PredictionStep
                    sessionId={sessionId}
                    datasetColumns={understandingData?.columns?.map(c => c.name) || []}
                    targetCol={problemInfo?.suggested_target}
                    problemType={problemInfo?.problem_type}
                    backendUrl={BACKEND_URL}
                    onPredictionMade={handlePredictionMade}
                  />
                )}

                {activeStep === 7 && (
                  <AIChatStep
                    sessionId={sessionId}
                    backendUrl={BACKEND_URL}
                    geminiModel={selectedModel}
                    apiKey={apiKey}
                    lastPrediction={lastPrediction}
                  />
                )}
              </div>

            </div>

            {/* Subtle Footer */}
            <div className="border-t border-[#ece4d8] pt-4 mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 font-medium">
              <span>ML DataSage AI • Autonomous Predictive Intelligence Studio</span>
              <span className="font-mono text-[11px] text-gray-400">Production v2.4 • Render Cloud</span>
            </div>
          </div>

          {/* Column 3: Right Profile & Activity Sidebar */}
          <div className="w-full md:w-80 bg-[#f6eee3] rounded-[28px] p-5 flex flex-col justify-between border border-[#ece4d8] shrink-0 space-y-6">
            
            <div className="space-y-5">
              
              {/* Top Icons & Profile */}
              <div className="flex items-center justify-between text-gray-600">
                <div className="relative cursor-pointer">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                </div>
                <button 
                  onClick={() => setShowKeyModal(true)}
                  className="cursor-pointer hover:text-black transition-all"
                  title="LLM Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* User / Session Monogram */}
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ffd2cc] to-[#ded8fd] flex items-center justify-center p-1 shadow-md">
                    <div className="w-full h-full bg-[#1c1917] rounded-full flex items-center justify-center text-white text-lg font-black">
                      AB
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-[#1c1917] text-base">Annette Black</h3>
                  <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-full text-xs font-semibold text-gray-600 mt-1 border border-[#e8dfd2] shadow-2xs">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    <span>274 Pipelines</span>
                    <span className="text-gray-300">›</span>
                  </div>
                </div>
              </div>

              {/* Activity Widget Card */}
              <div className="bg-white rounded-[24px] p-4.5 border border-[#e8dfd2] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Activity</div>
                    <div className="text-lg font-black text-[#1c1917] flex items-center gap-2">
                      <span>3.5h</span>
                      <span className="text-[11px] font-bold bg-[#c8f2da] text-emerald-900 px-2 py-0.5 rounded-full">
                        Great result!
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 bg-[#f6eee3] px-2.5 py-1 rounded-full cursor-pointer">
                    Year ▾
                  </span>
                </div>

                {/* Stacked Pastel Bar Chart (Matching Reference Image) */}
                <div className="pt-2 flex items-end justify-between gap-1.5 h-28 px-1">
                  
                  {/* Bar 1: Jan */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-5 rounded-t-lg bg-[#ffd2cc]" />
                      <div className="w-full h-4 bg-[#c8f2da]" />
                      <div className="w-full h-6 rounded-b-lg bg-[#ded8fd]" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">Jan</span>
                  </div>

                  {/* Bar 2: Feb */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-3 rounded-t-lg bg-[#fef08a]" />
                      <div className="w-full h-5 bg-[#c8f2da]" />
                      <div className="w-full h-4 rounded-b-lg bg-[#ffd2cc]" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">Feb</span>
                  </div>

                  {/* Bar 3: Aug */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-4 rounded-t-lg bg-[#ffe4c7]" />
                      <div className="w-full h-4 bg-[#c8f2da]" />
                      <div className="w-full h-4 rounded-b-lg bg-[#ded8fd]" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">Aug</span>
                  </div>

                  {/* Bar 4: Sep */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-6 rounded-t-lg bg-[#ffd2cc]" />
                      <div className="w-full h-5 bg-[#c8f2da]" />
                      <div className="w-full h-7 rounded-b-lg bg-[#ded8fd]" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">Sep</span>
                  </div>

                  {/* Bar 5: Oct */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-4 rounded-t-lg bg-[#ffe4c7]" />
                      <div className="w-full h-4 bg-[#c8f2da]" />
                      <div className="w-full h-3 rounded-b-lg bg-[#ffd2cc]" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">Oct</span>
                  </div>

                  {/* Bar 6: Nov */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-3 rounded-t-lg bg-[#ded8fd]" />
                      <div className="w-full h-4 rounded-b-lg bg-[#c8f2da]" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">Nov</span>
                  </div>

                  {/* Bar 7: Dec (Active Selected Highlight with Black Border) */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full border-2 border-black rounded-xl p-0.5 flex flex-col gap-0.5 items-center shadow-xs">
                      <div className="w-full h-6 rounded-t-md bg-[#ffe4c7]" />
                      <div className="w-full h-5 bg-[#c8f2da]" />
                      <div className="w-full h-5 bg-[#ded8fd]" />
                      <div className="w-full h-6 rounded-b-md bg-[#ffd2cc]" />
                    </div>
                    <span className="text-[10px] font-black bg-black text-white px-1.5 py-0.5 rounded-full">
                      Dec
                    </span>
                  </div>

                </div>
              </div>

              {/* "My Courses" / Active Models List */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  My pipelines
                </div>

                {/* Mini Card 1: Coral */}
                <div 
                  onClick={() => setActiveStep(4)}
                  className="card-coral p-4 cursor-pointer shadow-xs space-y-2 hover:scale-[1.02] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-800 flex items-center gap-1">
                      <Laptop className="w-3 h-3" />
                      LightGBM
                    </span>
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-amber-700 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      4.8
                    </span>
                  </div>
                  <h4 className="font-extrabold text-[#1c1917] text-sm leading-tight">
                    Flutter Masterclass (Dart, APIs, Firebase & More)
                  </h4>
                  <div className="text-[10px] text-gray-600 font-medium pt-1">
                    9,530 students / rows
                  </div>
                </div>

                {/* Mini Card 2: Peach */}
                <div 
                  onClick={() => setActiveStep(6)}
                  className="card-peach p-4 cursor-pointer shadow-xs space-y-2 hover:scale-[1.02] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-800 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      XGBoost
                    </span>
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-amber-700 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      4.9
                    </span>
                  </div>
                  <h4 className="font-extrabold text-[#1c1917] text-sm leading-tight">
                    Business Churn Predictor: Real-Time Inference
                  </h4>
                  <div className="text-[10px] text-gray-600 font-medium pt-1">
                    1,463 records scored
                  </div>
                </div>

              </div>

            </div>

            {/* Model & LLM Quick Switcher */}
            <div className="pt-3 border-t border-[#e5dacf] flex items-center justify-between text-xs">
              <span className="font-bold text-gray-500">LLM:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white border border-[#e5dacf] rounded-lg px-2 py-1 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

          </div>

        </div>

      </div>

      {/* Settings Modal (Gemini API Key) */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-slide-up">
          <div className="bg-white p-7 max-w-md w-full border border-gray-200 rounded-[32px] shadow-2xl space-y-4">
            <h3 className="text-xl font-extrabold text-[#1c1917] flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Configure Google Gemini API Key
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
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
                className="btn-secondary text-xs py-2 px-5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setApiKey(tempKey);
                  setShowKeyModal(false);
                }}
                className="btn-primary text-xs py-2 px-6"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
