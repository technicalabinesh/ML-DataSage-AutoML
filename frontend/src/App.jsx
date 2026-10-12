import React, { useState, useEffect } from 'react';
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
  Trash2,
  LogIn,
  User,
  Clock,
  LogOut,
  Sparkles,
  Award
} from 'lucide-react';

import UploadStep from './components/UploadStep';
import UnderstandingStep from './components/UnderstandingStep';
import CleaningStep from './components/CleaningStep';
import ProblemStep from './components/ProblemStep';
import TrainingStep from './components/TrainingStep';
import PredictionStep from './components/PredictionStep';
import AIChatStep from './components/AIChatStep';
import LoginPage from './components/LoginPage';

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

const DEFAULT_GUEST_USER = {
  name: 'Guest Analyst',
  initials: 'GA',
  role: 'AutoML Explorer',
  pipelinesCount: 0,
  email: 'guest@datasage.ai',
  isGuest: true,
  totalHours: 0.5
};

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

  // User & Login States
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('automl_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not parse saved user:", e);
    }
    return DEFAULT_GUEST_USER;
  });
  const [showLoginPage, setShowLoginPage] = useState(false);

  // Track session usage time (Hours used)
  const [sessionSeconds, setSessionSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const baseHours = currentUser?.totalHours || 4.2;
  const totalHoursUsed = (baseHours + (sessionSeconds / 3600)).toFixed(1);
  const sessionMins = Math.floor(sessionSeconds / 60);

  // Pipeline History State
  const [historyList, setHistoryList] = useState(() => {
    try {
      const saved = localStorage.getItem('automl_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not parse saved history:", e);
    }
    return [
      {
        id: '1',
        name: 'telecom_churn.csv',
        task: 'Classification',
        model: 'LightGBM',
        score: 'F1: 0.942',
        time: '12m ago',
        status: 'Trained',
        color: 'coral'
      },
      {
        id: '2',
        name: 'housing_prices.csv',
        task: 'Regression',
        model: 'XGBoost',
        score: 'R²: 0.915',
        time: '1h ago',
        status: 'Trained',
        color: 'peach'
      },
      {
        id: '3',
        name: 'customer_segmentation.csv',
        task: 'Clustering',
        model: 'K-Means',
        score: 'Silhouette: 0.72',
        time: 'Yesterday',
        status: 'Cleaned',
        color: 'lavender'
      }
    ];
  });

  // Config States
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const addToHistory = (entry) => {
    setHistoryList(prev => {
      const filtered = prev.filter(item => item.name !== entry.name);
      const updated = [entry, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('automl_history', JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not persist history:", e);
      }
      return updated;
    });
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('automl_user', JSON.stringify(user));
    } catch (e) {
      console.warn("Could not persist user:", e);
    }
    setShowLoginPage(false);
  };

  const handleLogout = (e) => {
    if (e) e.stopPropagation();
    try {
      localStorage.removeItem('automl_user');
    } catch (err) {
      console.warn("Could not clear user:", err);
    }
    setCurrentUser(DEFAULT_GUEST_USER);
    setShowLoginPage(true);
  };

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
    setShowLoginPage(false);

    addToHistory({
      id: Date.now().toString(),
      name: data.filename,
      task: 'Data Profiling',
      model: `${data.understanding?.total_rows?.toLocaleString() || 0} rows`,
      score: `${data.understanding?.total_cols || 0} cols`,
      time: 'Just now',
      status: 'Loaded',
      color: 'coral'
    });
  };

  const handleCleanSuccess = (data) => {
    setCleaningReport(data.report);
    setUnderstandingData(data.understanding);
    setActiveStep(3); // Jump to Problem Detection

    addToHistory({
      id: Date.now().toString(),
      name: filename,
      task: 'Data Cleaning',
      model: `${data.report?.final_rows?.toLocaleString() || 0} rows`,
      score: `${data.report?.duplicates_removed || 0} dupes fixed`,
      time: 'Just now',
      status: 'Cleaned',
      color: 'peach'
    });
  };

  const handleProblemConfirmed = (data) => {
    setProblemInfo(data);
  };

  const handleTrainSuccess = (data) => {
    setTrainingResults(data);

    if (filename) {
      const topMetric = Object.entries(data.best_metrics || {})[0];
      addToHistory({
        id: Date.now().toString(),
        name: filename,
        task: problemInfo?.problem_type?.toUpperCase() || 'AutoML',
        model: data.best_model_name,
        score: topMetric ? `${topMetric[0].slice(0, 4)}: ${topMetric[1]}` : 'Rank #1',
        time: 'Just now',
        status: 'Trained',
        color: 'lavender'
      });
    }
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
      setShowLoginPage(false);
    } catch (err) {
      console.error("Failed to switch dataset:", err);
    }
  };

  const handleHistoryClick = async (item) => {
    setShowLoginPage(false);
    if (availableDatasets.includes(item.name)) {
      handleSwitchDataset(item.name);
      return;
    }

    if (['telecom_churn.csv', 'housing_prices.csv', 'customer_segmentation.csv'].includes(item.name)) {
      const baseName = item.name.replace('.csv', '');
      try {
        const formData = new FormData();
        formData.append('sample_name', baseName);
        const res = await axios.post(`${BACKEND_URL}/api/load_sample`, formData);
        handleUploadSuccess(res.data);
      } catch (e) {
        try {
          const fileRes = await axios.get(`/samples/${item.name}`, { responseType: 'blob' });
          const uploadForm = new FormData();
          uploadForm.append('file', fileRes.data, item.name);
          const res2 = await axios.post(`${BACKEND_URL}/api/upload`, uploadForm);
          handleUploadSuccess(res2.data);
        } catch (e2) {
          console.warn("Failed to load sample dataset from history:", e2);
          setActiveStep(0);
        }
      }
    } else {
      setActiveStep(0);
    }
  };

  const handleDownloadDataset = async () => {
    if (!sessionId) {
      alert("Please upload and clean a dataset first.");
      return;
    }
    try {
      const res = await axios.get(`${BACKEND_URL}/api/download_cleaned/${sessionId}`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cleaned_${filename || 'dataset'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Could not download cleaned dataset:", e);
      alert("Please run Step 2 (Auto Data Cleaning) first to download the cleaned dataset.");
    }
  };

  // Nav item list for Left Rail
  const navItems = [
    { step: 0, icon: Home, label: "Upload Hub" },
    { step: 1, icon: BarChart2, label: "Data Profiling" },
    { step: 2, icon: Wand2, label: "Auto Cleaning" },
    { step: 3, icon: Target, label: "Problem Detection" },
    { step: 4, icon: Cpu, label: "Model Training" },
    { step: 6, icon: Crosshair, label: "Prediction Engine" },
    { step: 7, icon: Bot, label: "AI Analyst" }
  ];

  // Filter Pill buttons across top
  const filterPills = [
    { step: 0, label: "All Datasets", icon: Layers },
    { step: 1, label: "1. Profiling", icon: BarChart2 },
    { step: 2, label: "2. Cleaning", icon: Wand2 },
    { step: 3, label: "3. Target Detect", icon: Target },
    { step: 4, label: "4. Training", icon: Cpu },
    { step: 6, label: "5. Prediction", icon: Crosshair },
    { step: 7, label: "6. AI Analyst", icon: Bot }
  ];

  const getStepTitle = () => {
    if (showLoginPage) return "Sign In to AutoML Studio";
    switch (activeStep) {
      case 0: return "Explore AutoML Workflows";
      case 1: return "Understand your dataset";
      case 2: return "Clean & preprocess features";
      case 3: return "Identify Machine Learning Task";
      case 4: return "AI Model Training & Leaderboard";
      case 6: return "Real-Time Inference Sandbox";
      case 7: return "Chat with Autonomous AI Analyst";
      default: return "AutoML Analyst Studio";
    }
  };

  return (
    <div className="min-h-screen bg-[#bce8db] p-2 md:p-6 flex items-center justify-center font-sans antialiased selection:bg-[#ffd2cc]">
      
      {/* Outer macOS Safari Window Frame Matching Reference Image */}
      <div className="w-full max-w-[1440px] bg-[#fdfbf7] rounded-[36px] shadow-2xl border border-white/60 overflow-hidden flex flex-col min-h-[92vh]">
        
        {/* macOS Window Titlebar / Chrome Bar */}
        <div className="bg-[#f6eee3] px-6 py-3.5 border-b border-[#e8dfd2] flex items-center justify-between shrink-0">
          
          {/* macOS Window Controls (Traffic Lights) + Nav Chevrons */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border border-[#e0443e] cursor-pointer" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] border border-[#dea123] cursor-pointer" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f] border border-[#1aab29] cursor-pointer" />
            </div>

            <div className="flex items-center gap-1 text-[#78716c]">
              <ChevronLeft 
                onClick={() => {
                  setShowLoginPage(false);
                  setActiveStep(prev => Math.max(0, prev - 1));
                }}
                className="w-4 h-4 cursor-pointer hover:text-black transition-colors" 
              />
              <ChevronRight 
                onClick={() => {
                  setShowLoginPage(false);
                  setActiveStep(prev => Math.min(7, prev + 1));
                }}
                className="w-4 h-4 cursor-pointer hover:text-black transition-colors" 
              />
            </div>
          </div>

          {/* Center Address Pill */}
          <div className="bg-[#f3ece2] px-6 py-1.5 rounded-full flex items-center gap-2 text-xs font-black text-[#1c1917] shadow-2xs border border-[#e8dfd2]">
            <Lock className="w-3 h-3 text-[#1c1917]" />
            <span>ml-datasage.ai • AutoML Analyst Studio</span>
          </div>

          {/* Right Action Icons & Login Monogram Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLoginPage(prev => !prev)}
              className="bg-white hover:bg-[#fbf8f3] text-[#1c1917] px-3.5 py-1.5 rounded-full text-xs font-black border border-[#e8dfd2] shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
              title="Open Login Page / Switch User"
            >
              <LogIn className="w-3.5 h-3.5 text-[#1c1917]" />
              <span>
                {showLoginPage 
                  ? 'Back to Studio' 
                  : currentUser.isGuest 
                    ? 'Sign In / Guest' 
                    : currentUser.name}
              </span>
            </button>
            <Share2 className="w-4 h-4 text-[#78716c] cursor-pointer hover:text-black" />
            <Download 
              onClick={handleDownloadDataset} 
              className="w-4 h-4 text-[#78716c] cursor-pointer hover:text-black transition-colors" 
              title="Download Cleaned Dataset (CSV)"
            />
          </div>
        </div>

        {/* 3-Column Interior Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-3 md:p-4 gap-4">
          
          {/* Column 1: Left Slim Icon Navigation Rail */}
          <div className="w-full md:w-18 bg-[#f6eee3] rounded-[28px] p-3 flex md:flex-col items-center justify-between border border-[#ece4d8] shrink-0">
            
            {/* Top Brand Glyph */}
            <div 
              onClick={() => {
                setShowLoginPage(false);
                setActiveStep(0);
              }}
              className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center font-black text-lg cursor-pointer shadow-md hover:scale-105 transition-all"
              title="ML DataSage AI Hub"
            >
              <span className="text-lime-300 font-extrabold text-xl">⚡</span>
            </div>

            {/* Vertical Icons List */}
            <div className="flex md:flex-col items-center gap-2.5 my-2">
              {navItems.map((item) => {
                const isActive = !showLoginPage && activeStep === item.step;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.step}
                    onClick={() => {
                      setShowLoginPage(false);
                      setActiveStep(item.step);
                    }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-black text-white shadow-lg scale-105'
                        : 'bg-transparent text-[#78716c] hover:bg-white hover:text-black'
                    }`}
                    title={item.label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                );
              })}

              {/* Login Page Navigation Button */}
              <button
                onClick={() => setShowLoginPage(prev => !prev)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  showLoginPage
                    ? 'bg-black text-white shadow-lg scale-105'
                    : 'bg-transparent text-[#78716c] hover:bg-white hover:text-black'
                }`}
                title="Login Page & Account Workspace"
              >
                <LogIn className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Actions: Settings & Avatar */}
            <div className="flex md:flex-col items-center gap-2.5">
              <button
                onClick={() => setShowKeyModal(true)}
                className="w-10 h-10 rounded-full bg-white text-[#1c1917] hover:text-black flex items-center justify-center transition-all cursor-pointer shadow-2xs border border-[#e8dfd2]"
                title="Configure Google Gemini API Key"
              >
                <Settings className="w-4 h-4" />
              </button>

              <div 
                onClick={() => setShowLoginPage(true)}
                className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-black cursor-pointer shadow-md flex items-center justify-center text-xs font-black text-white bg-[#1c1917]"
                title={`Active User: ${currentUser.name} (${currentUser.role}) • Click to Login / Switch`}
              >
                <span>{currentUser.initials}</span>
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
                {!showLoginPage && filename && (
                  <div className="flex items-center gap-1.5 bg-[#f6eee3] border border-[#e8dfd2] rounded-full px-3 py-1 text-xs self-start sm:self-auto shadow-2xs">
                    <Database className="w-3.5 h-3.5 text-black" />
                    {availableDatasets.length > 1 ? (
                      <select
                        value={filename}
                        onChange={(e) => handleSwitchDataset(e.target.value)}
                        className="bg-transparent text-black font-black focus:outline-none cursor-pointer max-w-[140px] truncate"
                      >
                        {availableDatasets.map((d, i) => (
                          <option key={i} value={d} className="bg-white text-black font-bold">{d}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-black font-black max-w-[150px] truncate">{filename}</span>
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
              {!showLoginPage && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {filterPills.map((pill) => {
                    const isActive = activeStep === pill.step;
                    const Icon = pill.icon;
                    return (
                      <button
                        key={pill.step}
                        onClick={() => {
                          setShowLoginPage(false);
                          setActiveStep(pill.step);
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-[#1c1917] text-white shadow-md'
                            : 'bg-white text-[#1c1917] hover:bg-[#f6eee3] border border-[#e8dfd2]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{pill.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step Content Canvas or Dedicated Login Page */}
              <div className="pt-2">
                {showLoginPage ? (
                  <LoginPage
                    currentUser={currentUser}
                    onLogin={handleLogin}
                    onCancel={() => setShowLoginPage(false)}
                  />
                ) : (
                  <>
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
                      <ProblemStep
                        sessionId={sessionId}
                        backendUrl={BACKEND_URL}
                        datasetColumns={understandingData?.columns || []}
                        onProblemConfirmed={handleProblemConfirmed}
                      />
                    )}

                    {activeStep === 4 && (
                      <TrainingStep
                        sessionId={sessionId}
                        targetCol={problemInfo?.suggested_target}
                        problemType={problemInfo?.problem_type}
                        backendUrl={BACKEND_URL}
                        onTrainSuccess={handleTrainSuccess}
                      />
                    )}

                    {activeStep === 6 && (
                      <PredictionStep
                        sessionId={sessionId}
                        datasetColumns={understandingData?.columns || []}
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
                  </>
                )}
              </div>

            </div>

            {/* Footer Attribution Status */}
            <div className="pt-8 border-t border-[#f0e8dc] flex items-center justify-between text-[11px] font-bold text-[#78716c]">
              <span>ML DataSage AI • Autonomous Predictive Intelligence Studio</span>
              <span className="font-mono font-black text-[#1c1917]">Production v2.4 • Render Cloud</span>
            </div>

          </div>

          {/* Column 3: Right Profile, Activity & History Panel */}
          <div className="w-full md:w-80 bg-[#f6eee3] rounded-[28px] p-5 flex flex-col justify-between border border-[#ece4d8] shrink-0 space-y-6">
            
            <div className="space-y-6">
              
              {/* Right Panel Header: Notification + Settings + Login */}
              <div className="flex items-center justify-between text-[#78716c]">
                <div 
                  onClick={() => setShowLoginPage(true)}
                  className="flex items-center gap-1.5 text-xs font-black text-[#1c1917] cursor-pointer hover:underline"
                  title="Open Login Page"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{currentUser.isGuest ? 'Sign In / Guest' : 'Switch User'}</span>
                </div>

                <div className="flex items-center gap-2">
                  {!currentUser.isGuest && (
                    <button
                      onClick={handleLogout}
                      className="text-[10px] font-black text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-full cursor-pointer transition-all border border-rose-200"
                      title="Sign Out"
                    >
                      Sign Out
                    </button>
                  )}
                  <div className="relative cursor-pointer hover:text-black">
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
              </div>

              {/* User Profile Card */}
              <div 
                onClick={() => setShowLoginPage(true)}
                className="flex flex-col items-center text-center space-y-2 cursor-pointer group p-2 rounded-2xl hover:bg-white/50 transition-all"
                title="Click to Switch User / Login"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ffd2cc] to-[#ded8fd] flex items-center justify-center p-1 shadow-md group-hover:scale-105 transition-all">
                    <div className="w-full h-full bg-[#1c1917] rounded-full flex items-center justify-center text-white text-lg font-black">
                      {currentUser.initials}
                    </div>
                  </div>
                  <div className={`absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full ${currentUser.isGuest ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                </div>
                <div>
                  <h3 className="font-black text-[#1c1917] text-base group-hover:underline flex items-center justify-center gap-1">
                    <span>{currentUser.name}</span>
                    <span className="text-[10px] text-gray-400">▾</span>
                  </h3>
                  <div className="text-[11px] font-bold text-[#78716c]">{currentUser.role}</div>
                  <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-full text-xs font-black text-[#1c1917] mt-1 border border-[#e8dfd2] shadow-2xs">
                    <Users className="w-3.5 h-3.5 text-gray-600" />
                    <span>{currentUser.pipelinesCount} Pipelines</span>
                    <span className="text-gray-400">›</span>
                  </div>
                </div>
              </div>

              {/* Activity Widget Card - "How many hours he used" */}
              <div className="bg-white rounded-[24px] p-4.5 border border-[#e8dfd2] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#78716c] font-black uppercase tracking-wider">
                      Hours Used
                    </div>
                    <div className="text-xl font-black text-[#1c1917] flex items-center gap-2">
                      <span>{totalHoursUsed}h</span>
                      <span className="text-[10px] font-black bg-[#c8f2da] text-emerald-950 px-2 py-0.5 rounded-full">
                        {sessionMins > 0 ? `+${sessionMins}m session` : 'Active now'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#1c1917] bg-[#f6eee3] px-2.5 py-1 rounded-full border border-[#e8dfd2]">
                    Year ▾
                  </span>
                </div>

                <div className="text-[10px] font-bold text-[#78716c]">
                  Active workspace time tracked for {currentUser.name}
                </div>

                {/* Stacked Pastel Bar Chart */}
                <div className="pt-2 flex items-end justify-between gap-1.5 h-24 px-1">
                  
                  {/* Bar 1: Jan */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-5 rounded-t-lg bg-[#ffd2cc]" />
                      <div className="w-full h-4 bg-[#c8f2da]" />
                      <div className="w-full h-6 rounded-b-lg bg-[#ded8fd]" />
                    </div>
                    <span className="text-[10px] text-[#78716c] font-black">Jan</span>
                  </div>

                  {/* Bar 2: Feb */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-3 rounded-t-lg bg-[#fef08a]" />
                      <div className="w-full h-5 bg-[#c8f2da]" />
                      <div className="w-full h-4 rounded-b-lg bg-[#ffd2cc]" />
                    </div>
                    <span className="text-[10px] text-[#78716c] font-black">Feb</span>
                  </div>

                  {/* Bar 3: Aug */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-4 rounded-t-lg bg-[#ffe4c7]" />
                      <div className="w-full h-4 bg-[#c8f2da]" />
                      <div className="w-full h-4 rounded-b-lg bg-[#ded8fd]" />
                    </div>
                    <span className="text-[10px] text-[#78716c] font-black">Aug</span>
                  </div>

                  {/* Bar 4: Sep */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-6 rounded-t-lg bg-[#ffd2cc]" />
                      <div className="w-full h-5 bg-[#c8f2da]" />
                      <div className="w-full h-7 rounded-b-lg bg-[#ded8fd]" />
                    </div>
                    <span className="text-[10px] text-[#78716c] font-black">Sep</span>
                  </div>

                  {/* Bar 5: Oct */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-4 rounded-t-lg bg-[#ffe4c7]" />
                      <div className="w-full h-4 bg-[#c8f2da]" />
                      <div className="w-full h-3 rounded-b-lg bg-[#ffd2cc]" />
                    </div>
                    <span className="text-[10px] text-[#78716c] font-black">Oct</span>
                  </div>

                  {/* Bar 6: Nov */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex flex-col gap-0.5 items-center">
                      <div className="w-full h-3 rounded-t-lg bg-[#ded8fd]" />
                      <div className="w-full h-4 rounded-b-lg bg-[#c8f2da]" />
                    </div>
                    <span className="text-[10px] text-[#78716c] font-black">Nov</span>
                  </div>

                  {/* Bar 7: Dec */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full border-2 border-black rounded-xl p-0.5 flex flex-col gap-0.5 items-center shadow-xs">
                      <div className="w-full h-5 rounded-t-md bg-[#ffe4c7]" />
                      <div className="w-full h-4 bg-[#c8f2da]" />
                      <div className="w-full h-4 bg-[#ded8fd]" />
                      <div className="w-full h-5 rounded-b-md bg-[#ffd2cc]" />
                    </div>
                    <span className="text-[10px] font-black bg-black text-white px-1.5 py-0.5 rounded-full">
                      Dec
                    </span>
                  </div>

                </div>
              </div>

              {/* 📜 Pipeline & Dataset History Section (Replaced My Pipelines) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-[#1c1917] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-black" />
                    <span>Pipeline History</span>
                  </div>
                  {historyList.length > 0 && (
                    <button
                      onClick={() => {
                        setHistoryList([]);
                        localStorage.removeItem('automl_history');
                      }}
                      className="text-[10px] font-black text-gray-400 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {historyList.length === 0 ? (
                    <div className="bg-white p-4 rounded-2xl border border-[#e8dfd2] text-center text-xs font-bold text-gray-400">
                      No recent pipeline runs yet.
                    </div>
                  ) : (
                    historyList.map((item, idx) => {
                      const cardClass = item.color === 'coral' 
                        ? 'card-coral' 
                        : item.color === 'peach' 
                        ? 'card-peach' 
                        : 'card-lavender';

                      return (
                        <div 
                          key={item.id || idx}
                          onClick={() => handleHistoryClick(item)}
                          className={`${cardClass} p-3.5 cursor-pointer shadow-xs space-y-1.5 hover:scale-[1.02] transition-all`}
                          title={`Click to inspect or load ${item.name}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-black text-[#1c1917] flex items-center gap-1">
                              <Laptop className="w-3 h-3" />
                              {item.model || item.task}
                            </span>
                            <span className="bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-black text-amber-800 flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              {item.score || item.status}
                            </span>
                          </div>
                          <h4 className="font-black text-[#1c1917] text-xs leading-snug truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center justify-between text-[10px] text-gray-700 font-bold pt-0.5">
                            <span>{item.task || 'AutoML Pipeline'}</span>
                            <span className="text-gray-500 font-semibold">{item.time || 'Recently'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Model & LLM Quick Switcher */}
            <div className="pt-3 border-t border-[#e5dacf] flex items-center justify-between text-xs">
              <span className="font-black text-[#1c1917]">LLM:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white border border-[#e5dacf] rounded-lg px-2 py-1 text-xs font-black text-[#1c1917] focus:outline-none cursor-pointer max-w-[180px] truncate"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-slide-up">
          <div className="bg-white p-7 max-w-md w-full border border-[#e8dfd2] rounded-[32px] shadow-2xl space-y-4">
            <h3 className="text-xl font-black text-[#1c1917] flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Configure Google Gemini API Key
            </h3>
            <p className="text-xs text-[#57534e] leading-relaxed font-bold">
              Enter your Google Gemini API key to enable direct cloud LLM chat reasoning in <strong>ML DataSage AI</strong>. If left empty, the application seamlessly uses the built-in Statistical AI Engine fallback.
            </p>

            <input
              type="password"
              placeholder="AIzaSy..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="input-field my-2 bg-[#fbf8f3] border border-[#d6cbbe] text-[#1c1917] font-bold"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="btn-secondary text-xs py-2 px-5 font-black"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setApiKey(tempKey);
                  setShowKeyModal(false);
                }}
                className="btn-primary text-xs py-2 px-6 font-black"
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
