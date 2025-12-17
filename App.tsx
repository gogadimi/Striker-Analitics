import React, { useState, useEffect } from 'react';
import VideoUploader from './components/VideoUploader';
import CameraCapture from './components/CameraCapture';
import AnalysisResult from './components/AnalysisResult';
import Tooltip from './components/Tooltip';
import { analyzeVideo } from './services/geminiService';
import { AnalysisResponse, AppStatus } from './types';

type InputMode = 'MENU' | 'UPLOAD' | 'CAMERA';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [inputMode, setInputMode] = useState<InputMode>('MENU');
  
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Create a persistent URL for the result view
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    
    setStatus(AppStatus.IDLE);
    setResult(null);
    setErrorMsg(null);
    setInputMode('MENU'); // We technically leave the input mode to show the preview/analyze UI
  };

  // Cleanup URL on unmount or new file
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setStatus(AppStatus.ANALYZING);
    setErrorMsg(null);

    try {
      const data = await analyzeVideo(selectedFile);
      
      // Check for explicit error status in the JSON response
      if (data.status === 'error') {
        throw new Error("Analysis failed: The video was unclear or not a recognized football drill. Please try again with a clearer video.");
      }

      setResult(data);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setStatus(AppStatus.ERROR);
      
      let message = "An unexpected error occurred during analysis. Please try again.";
      
      if (err instanceof Error) {
        const lowerMsg = err.message.toLowerCase();
        
        if (lowerMsg.includes("api key")) {
          message = "Configuration Error: API Key is missing or invalid.";
        } else if (lowerMsg.includes("safety") || lowerMsg.includes("blocked")) {
          message = "Analysis blocked: The video content was flagged by safety filters. Please ensure the video clearly shows sports training.";
        } else if (lowerMsg.includes("quota") || lowerMsg.includes("429")) {
          message = "Usage limit exceeded. The AI service is busy, please try again in a few minutes.";
        } else if (lowerMsg.includes("503") || lowerMsg.includes("overloaded")) {
          message = "The AI service is currently overloaded. Please wait a moment and try again.";
        } else if (lowerMsg.includes("fetch") || lowerMsg.includes("network")) {
          message = "Network Error: Please check your internet connection.";
        } else if (lowerMsg.includes("json")) {
          message = "Data Error: The AI response could not be processed. Please try a clearer video clip.";
        } else if (err.message.length > 5 && err.message.length < 200) {
           message = err.message;
        }
      }
      
      setErrorMsg(message);
    }
  };

  const resetApp = () => {
    setResult(null);
    setSelectedFile(null);
    setVideoUrl(null);
    setStatus(AppStatus.IDLE);
    setInputMode('MENU');
    setErrorMsg(null);
  };

  // --- Render Functions ---

  const renderDashboard = () => (
    <div className="flex flex-col md:flex-row gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Upload Video Card */}
      <button
        onClick={() => setInputMode('UPLOAD')}
        className="flex-1 bg-[#112E42] rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all hover:bg-[#1A4563] hover:scale-[1.02] border border-transparent hover:border-gray-600 shadow-xl group h-64 md:h-80"
      >
        <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mb-6 group-hover:bg-[#7FD1C7]/20 transition-colors">
          <svg className="w-10 h-10 text-[#7FD1C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Upload Video</h3>
        <p className="text-[#9FBCCF] text-sm">Select from gallery</p>
      </button>

      {/* Record Drill Card - Primary */}
      <button
        onClick={() => setInputMode('CAMERA')}
        className="flex-1 bg-[#7FD1C7] rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all hover:bg-[#6BC0B6] hover:scale-[1.02] shadow-[0_0_30px_rgba(127,209,199,0.3)] group h-64 md:h-80"
      >
        <div className="w-20 h-20 rounded-full bg-[#0A1F2D]/10 flex items-center justify-center mb-6 group-hover:bg-[#0A1F2D]/20 transition-colors">
          <svg className="w-10 h-10 text-[#0A1F2D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-[#0A1F2D] mb-2">Record Drill</h3>
        <p className="text-[#0A1F2D]/70 text-sm font-medium">Smart camera</p>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A1F2D] text-white font-sans selection:bg-[#7FD1C7]/30 pb-20">
      {/* Header */}
      <header className="bg-[#0A1F2D] border-b border-[#112E42] sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={resetApp}
          >
            {/* New Image Logo */}
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 rounded-xl">
              <img 
                src="/striker.logo.jpg" 
                alt="Striker Analytics Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                    // Fallback to a placeholder colored box if image is missing
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
               {/* Fallback Icon (Hidden if image loads) */}
               <div className="hidden w-10 h-10 bg-[#7FD1C7] rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#0A1F2D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
               </div>
            </div>
            
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#7FD1C7] transition-colors">
              Striker <span className="text-[#7FD1C7] group-hover:text-white transition-colors">Analytics</span>
            </span>
          </div>
          <div className="text-xs text-[#9FBCCF] font-mono hidden sm:block">
            Powered by Gigavoice
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Intro Text (only show on Menu) */}
        {!selectedFile && inputMode === 'MENU' && (
          <div className="text-center mb-10 animate-fade-in-down">
            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#9FBCCF] mb-4">
              Level Up Your Game
            </h1>
            <p className="text-lg text-[#9FBCCF] max-w-2xl mx-auto leading-relaxed">
              Analyze your <Tooltip content="The study of body movements, joint angles, and muscular activity.">biomechanics</Tooltip>, identify errors, and get instant pro feedback.
            </p>
          </div>
        )}

        {/* --- STATE: MENU --- */}
        {!selectedFile && inputMode === 'MENU' && renderDashboard()}

        {/* --- STATE: UPLOAD --- */}
        {!selectedFile && inputMode === 'UPLOAD' && (
          <div className="animate-fade-in">
             <div className="mb-6 flex items-center justify-between max-w-2xl mx-auto">
               <button onClick={() => setInputMode('MENU')} className="text-[#9FBCCF] hover:text-white flex items-center text-sm font-medium">
                 <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                 </svg>
                 Back to Menu
               </button>
               <h2 className="text-xl font-bold">Upload Video</h2>
               <div className="w-16"></div> {/* Spacer */}
             </div>
             <VideoUploader 
               onFileSelect={handleFileSelect} 
               isLoading={status === AppStatus.ANALYZING} 
             />
          </div>
        )}

        {/* --- STATE: CAMERA --- */}
        {!selectedFile && inputMode === 'CAMERA' && (
           <div className="animate-fade-in">
             <div className="mb-6 flex items-center justify-between max-w-2xl mx-auto">
               <button onClick={() => setInputMode('MENU')} className="text-[#9FBCCF] hover:text-white flex items-center text-sm font-medium">
                 <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                 </svg>
                 Back to Menu
               </button>
               <h2 className="text-xl font-bold">Smart Camera</h2>
               <div className="w-16"></div> {/* Spacer */}
             </div>
             <CameraCapture 
               onCapture={handleFileSelect}
               onCancel={() => setInputMode('MENU')}
             />
           </div>
        )}

        {/* --- STATE: PREVIEW & ANALYZE --- */}
        {selectedFile && !result && status !== AppStatus.ANALYZING && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-[#112E42] rounded-2xl p-6 shadow-xl border border-[#1A4563]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Review Video</h3>
                <button onClick={resetApp} className="text-[#9FBCCF] hover:text-white text-sm">
                  Change Video
                </button>
              </div>
              
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-8">
                <video 
                  src={videoUrl || ""} 
                  controls 
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleAnalyze}
                  className="px-10 py-4 bg-[#7FD1C7] hover:bg-[#6BC0B6] text-[#0A1F2D] rounded-full font-bold text-lg shadow-lg shadow-[#7FD1C7]/30 transition-all transform hover:-translate-y-1 hover:shadow-xl"
                >
                  Analyze Form
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- STATE: LOADING --- */}
        {status === AppStatus.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
             <div className="relative w-20 h-20 mb-6">
               <div className="absolute top-0 left-0 w-full h-full border-4 border-[#112E42] rounded-full"></div>
               <div className="absolute top-0 left-0 w-full h-full border-4 border-[#7FD1C7] rounded-full border-t-transparent animate-spin"></div>
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Analyzing Biomechanics</h3>
             <p className="text-[#9FBCCF]">Extracting keypoints and evaluating technique...</p>
          </div>
        )}

        {/* --- STATE: ERROR --- */}
        {status === AppStatus.ERROR && (
          <div className="max-w-2xl mx-auto mb-12 bg-red-900/20 border border-red-500/50 rounded-xl p-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 animate-fade-in">
            <div className="bg-red-900/50 p-3 rounded-full">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-red-400 font-bold text-lg mb-1">Analysis Failed</h3>
              <p className="text-red-200 text-sm leading-relaxed">{errorMsg}</p>
            </div>
            <button 
              onClick={() => { setStatus(AppStatus.IDLE); }}
              className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded-lg text-red-300 text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* --- STATE: RESULT --- */}
        {result && status === AppStatus.SUCCESS && videoUrl && (
          <AnalysisResult data={result} videoUrl={videoUrl} />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[#112E42] mt-20 py-8 bg-[#0A1F2D]/50">
        <div className="max-w-7xl mx-auto px-4 text-center text-[#9FBCCF] text-sm">
          <p>&copy; {new Date().getFullYear()} Striker Analytics. Built with Gemini 2.5 Flash & React.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;