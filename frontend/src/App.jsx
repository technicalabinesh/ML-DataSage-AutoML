import React, { useState } from 'react';
import Header from './components/Header';
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

export default function App() {
  const [activeStep, setActiveStep] = useState(0); // 0 = Upload, 1-7 = Steps
  const [sessionId, setSessionId] = useState(null);
  const [filename, setFilename] = useState('');
  
  // Pipeline States
  const [understandingData, setUnderstandingData] = useState(null);
  const [cleaningReport, setCleaningReport] = useState(null);
  const [problemInfo, setProblemInfo] = useState(null);
  const [trainingResults, setTrainingResults] = useState(null);
  const [lastPrediction, setLastPrediction] = useState(null);

  // Config States
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');

  const handleUploadSuccess = (data) => {
    setSessionId(data.session_id);
    setFilename(data.filename);
    setUnderstandingData(data.understanding);
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

  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-gray-100 font-sans">
      <Header
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        apiKey={apiKey}
        setApiKey={setApiKey}
        filename={filename}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6">
        {activeStep === 0 && (
          <UploadStep onUploadSuccess={handleUploadSuccess} backendUrl={BACKEND_URL} />
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
            onCleanSuccess={handleCleanSuccess}
          />
        )}

        {activeStep === 3 && (
          <div className="space-y-6">
            <ProblemStep
              sessionId={sessionId}
              backendUrl={BACKEND_URL}
              datasetColumns={understandingData?.columns || []}
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

        {activeStep === 5 && (
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
      </main>

      <footer className="border-t border-white/10 py-5 text-center text-xs font-semibold text-gray-400">
        ML DataSage AI • Autonomous Data Cleaning, Problem Detection, Model Selection & AI Chat Assistant
      </footer>
    </div>
  );
}
