import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, Sparkles, X, Loader2, Volume2, Monitor, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';
import { analyzePlantDisease } from '../services/aiService';
import { Translation, Language } from '../types';
import { speak } from '../services/ttsService';

interface DiseaseAnalyzerProps {
  t: Translation;
  language: Language;
  cameraImage: string | null;
  setCameraImage: (image: string | null) => void;
  isSocketConnected?: boolean;
  reconnectSocket?: () => void;
}

export const DiseaseAnalyzer: React.FC<DiseaseAnalyzerProps> = ({ 
  t, 
  language, 
  cameraImage, 
  setCameraImage,
  isSocketConnected = false,
  reconnectSocket
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastImageTime, setLastImageTime] = useState<Date | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ lastImageReceivedAt: string | null, imageCount: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/camera-status');
        const data = await response.json();
        setServerStatus(data);
      } catch (error) {
        console.error("Failed to fetch camera status:", error);
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cameraImage) {
      setLastImageTime(new Date());
      // Automatically set the main image when a new camera image arrives
      // Clean the image string (remove quotes, equals signs, whitespace, newlines)
      let cleanImage = cameraImage.trim().replace(/^["'=]+|["']+$/g, '').replace(/\s/g, '');
      
      let formattedImage = cleanImage;
      if (!cleanImage.startsWith('data:')) {
        let mimeType = 'image/jpeg';
        if (cleanImage.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
        else if (cleanImage.startsWith('R0lGOD')) mimeType = 'image/gif';
        else if (cleanImage.startsWith('UklGR')) mimeType = 'image/webp';
        formattedImage = `data:${mimeType};base64,${cleanImage}`;
      }
        
      setImage(formattedImage);
    }
  }, [cameraImage]);

  const testConnection = async () => {
    setIsTesting(true);
    try {
      await fetch('/api/test-socket');
    } catch (error) {
      console.error("Test socket failed:", error);
    } finally {
      setTimeout(() => setIsTesting(false), 1000);
    }
  };

  const useCameraImage = () => {
    if (cameraImage) {
      // Clean the image string (remove quotes, equals signs, whitespace, newlines)
      let cleanImage = cameraImage.trim().replace(/^["'=]+|["']+$/g, '').replace(/\s/g, '');
      
      let formattedImage = cleanImage;
      if (!cleanImage.startsWith('data:')) {
        let mimeType = 'image/jpeg';
        if (cleanImage.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
        else if (cleanImage.startsWith('R0lGOD')) mimeType = 'image/gif';
        else if (cleanImage.startsWith('UklGR')) mimeType = 'image/webp';
        formattedImage = `data:${mimeType};base64,${cleanImage}`;
      }
      
      setImage(formattedImage);
      setResult(null);
    }
  };

  const handleSpeak = async () => {
    if (!result) return;
    setIsSpeaking(true);
    // Strip markdown for better speech
    const plainText = result.replace(/[#*`]/g, '');
    await speak(plainText, language);
    setIsSpeaking(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzePlantDisease(image, language);
      setResult(analysis);
    } catch (error) {
      setResult("Error analyzing image. Please check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl p-8 shadow-sm border border-black/5"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500 rounded-2xl">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{t.diseaseAnalysis}</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isSocketConnected ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-stone-50 border-stone-100 text-stone-400'}`}>
            {isSocketConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isSocketConnected ? 'Camera Connected' : 'Camera Offline'}
            </span>
          </div>
          {!isSocketConnected && reconnectSocket && (
            <button 
              onClick={reconnectSocket}
              className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"
              title="Retry Connection"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {isSocketConnected && (
            <button 
              onClick={testConnection}
              disabled={isTesting}
              className={`p-2 rounded-lg transition-colors ${isTesting ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 hover:bg-stone-200 text-stone-600'}`}
              title="Test Socket Connection"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {cameraImage ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-emerald-200">
                  <img src={cameraImage} alt="Camera Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">New Camera Image</p>
                  <p className="text-xs font-bold text-emerald-900">ESP32-CAM is ready</p>
                  {lastImageTime && (
                    <p className="text-[9px] text-emerald-500 font-medium">
                      Received at {lastImageTime.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={useCameraImage}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
                >
                  Use Image
                </button>
                <button
                  onClick={() => setCameraImage(null)}
                  className="p-2 text-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : isSocketConnected && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Waiting for ESP32-CAM image via n8n...</p>
              </div>
              {serverStatus && (
                <div className="pt-2 border-t border-stone-200 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-[0.1em]">Server Received</p>
                    <p className="text-[10px] font-bold text-stone-600">{serverStatus.imageCount} images total</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-[0.1em]">Last Arrival</p>
                    <p className="text-[10px] font-bold text-stone-600">
                      {serverStatus.lastImageReceivedAt ? new Date(serverStatus.lastImageReceivedAt).toLocaleTimeString() : 'Never'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-3xl border-2 border-dashed border-black/10 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-colors overflow-hidden relative group"
          >
            {image ? (
              <>
                <img src={image} alt="Upload" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="w-12 h-12 text-white" />
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setImage(null); setResult(null); }}
                  className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="text-center p-8">
                <Upload className="w-12 h-12 text-black/20 mx-auto mb-4" />
                <p className="text-sm font-medium text-black/40 uppercase tracking-widest">{t.uploadImage}</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              accept="image/*" 
            />
          </div>

          <button
            disabled={!image || isAnalyzing}
            onClick={handleAnalyze}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20 active:scale-95"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.loading}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {t.analyzeImage}
              </>
            )}
          </button>
        </div>

        <div className="bg-stone-50 rounded-3xl p-8 min-h-[400px] relative overflow-hidden border border-black/5">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Simple Analysis</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSpeak}
                    disabled={isSpeaking}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                  >
                    {isSpeaking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                    <span>{t.listen}</span>
                  </motion.button>
                </div>
                <div className="prose prose-sm max-w-none 
                  prose-headings:text-indigo-600 
                  prose-headings:font-black 
                  prose-headings:uppercase 
                  prose-headings:tracking-widest 
                  prose-headings:text-[11px]
                  prose-p:text-stone-600 
                  prose-p:font-medium
                  prose-strong:text-stone-900
                  prose-strong:font-black
                  prose-li:text-stone-600
                  prose-li:font-medium
                ">
                  <Markdown>{result}</Markdown>
                </div>
                <div className="pt-6 border-t border-black/5">
                  <p className="text-[10px] font-bold text-stone-400 italic">
                    * This is an AI suggestion. Please consult a local expert for critical decisions.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center text-black/30"
              >
                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium uppercase tracking-widest">{t.analysisResult}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
