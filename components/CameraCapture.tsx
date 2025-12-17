import React, { useRef, useState, useEffect, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [useTimer, setUseTimer] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Recording timer display (0s -> 10s)
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API not supported in this browser.");
      return;
    }

    try {
      // Cleanup previous stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera Error:", err);
      let msg = "Could not access camera. Please ensure permissions are granted.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Camera permission was denied. Please allow camera access in your browser settings.";
      } else if (err.name === 'NotFoundError') {
        msg = "No camera found on this device.";
      } else if (err.name === 'NotReadableError') {
        msg = "Camera is currently in use by another application.";
      } else if (err.message && err.message.toLowerCase().includes("dismissed")) {
        msg = "Camera permission request was dismissed. Please reload and allow access.";
      }
      
      setError(msg);
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }
    };
  }, [startCamera]);

  const playBeep = (freq = 800, type: OscillatorType = 'sine') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = type;
      oscillator.frequency.value = freq;
      
      const currentTime = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0.1, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + 0.1);
    } catch (e) {
      console.warn("AudioContext not supported or blocked");
    }
  };

  const handleStartSequence = async () => {
    if (!videoRef.current?.srcObject) return;

    if (useTimer) {
      setIsCountingDown(true);
      for (let i = 5; i > 0; i--) {
        setCountdownValue(i);
        playBeep(800, 'sine');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      // Final start beep
      playBeep(1200, 'square');
      setCountdownValue(null);
      setIsCountingDown(false);
    }
    
    startRecording();
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    
    const stream = videoRef.current.srcObject as MediaStream;
    // Check supported mime types
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
      ? 'video/webm;codecs=vp9' 
      : 'video/webm';

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const file = new File([blob], "drill_recording.webm", { type: 'video/webm' });
      onCapture(file);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    // Auto-stop after 10 seconds logic
    recordingIntervalRef.current = window.setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 10) {
          stopRecording();
          return 10;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-2xl border border-red-500/30 w-full max-w-2xl mx-auto h-[500px] animate-fade-in">
        <div className="p-4 bg-red-900/50 rounded-full mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Camera Access Failed</h3>
        <p className="text-gray-300 mb-8 text-center max-w-md leading-relaxed">{error}</p>
        <div className="flex space-x-4">
          <button 
            onClick={onCancel} 
            className="px-6 py-3 bg-gray-700 rounded-xl text-white font-medium hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
          <button 
            onClick={() => startCamera()} 
            className="px-6 py-3 bg-red-600 rounded-xl text-white font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800 animate-fade-in">
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className={`w-full h-[500px] object-cover transition-opacity duration-300 ${isCountingDown ? 'opacity-50' : 'opacity-100'}`}
      />
      
      {/* Silhouette Overlay */}
      {!isRecording && !isCountingDown && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-96 border-4 border-dashed border-white/30 rounded-[3rem] flex items-center justify-center">
             <span className="text-white/50 font-bold uppercase tracking-widest text-sm bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">Align Body Here</span>
          </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {isCountingDown && countdownValue !== null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-[12rem] font-black text-white drop-shadow-2xl animate-pulse">
            {countdownValue}
          </div>
        </div>
      )}

      {/* Recording Timer / Auto-stop Indicator */}
      {isRecording && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur-md px-4 py-1 rounded-full border border-red-400/50 shadow-lg z-20">
           <span className="text-white font-mono font-bold">{formatTime(recordingTime)} / 0:10</span>
        </div>
      )}

      {/* UI Controls Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 z-10">
        
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          {!isRecording && !isCountingDown && (
            <button 
              onClick={onCancel}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {/* Timer Toggle */}
          {!isRecording && !isCountingDown && (
            <button 
              onClick={() => setUseTimer(!useTimer)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-md border transition-all ${
                useTimer 
                  ? 'bg-[#7FD1C7]/20 border-[#7FD1C7] text-[#7FD1C7]' 
                  : 'bg-black/40 border-gray-600 text-gray-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-bold">{useTimer ? 'Timer ON' : 'Timer OFF'}</span>
            </button>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="flex justify-center items-center pb-4 pointer-events-auto">
          {!isRecording && !isCountingDown ? (
            <button 
              onClick={handleStartSequence}
              className="group relative"
            >
              <div className="absolute inset-0 bg-red-600 rounded-full opacity-75 group-hover:opacity-100 animate-ping"></div>
              <div className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-red-600 shadow-2xl transition-transform transform group-hover:scale-105">
                <div className="w-8 h-8 bg-transparent" />
              </div>
            </button>
          ) : isRecording ? (
            <button 
              onClick={stopRecording}
              className="w-20 h-20 rounded-full border-4 border-gray-300 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all transform hover:scale-105"
            >
              <div className="w-8 h-8 bg-red-600 rounded-md" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;