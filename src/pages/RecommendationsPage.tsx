import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Sparkles, Loader2, Calendar, Droplets, Thermometer, MapPin, ArrowLeft, FlaskConical, RefreshCw, Volume2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { SensorData, Translation, Language } from '../types';
import { speak } from '../services/ttsService';

export const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state as { sensorData: SensorData, t: Translation, language: Language };
  const { sensorData, t, language } = locationState || {};

  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [crops, setCrops] = useState<string[]>([]);
  const [cropImages, setCropImages] = useState<Record<string, string>>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleSpeak = async () => {
    if (!crops.length) return;
    setIsSpeaking(true);
    const text = `${t.recommendedCrops}: ${crops.join(', ')}`;
    await speak(text, language);
    setIsSpeaking(null);
  };

  useEffect(() => {
    if (!sensorData || !t) {
      navigate('/');
      return;
    }
    getRecommendation();
  }, []);

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => resolve(null),
        { timeout: 10000 }
      );
    });
  };

  const getRecommendation = async () => {
    setLoading(true);
    setStatus('analyzing_soil');
    try {
      const userLocation = await getLocation();
      setLocation(userLocation);

      const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY || '' });
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      
      const locationContext = userLocation 
        ? `Location: Latitude ${userLocation.lat.toFixed(4)}, Longitude ${userLocation.lng.toFixed(4)}`
        : "Location: Unknown (provide general recommendations)";

      const prompt = `List the 3 most suitable common crop names for a farmer based on:
      - Location: ${locationContext}
      - Month: ${currentMonth}
      - Soil Moisture: ${sensorData.soilMoisture}%
      - pH Level: ${sensorData.phValue}
      - Temperature: ${sensorData.temperature}°C
      - Humidity: ${sensorData.humidity}%
      
      Return ONLY a JSON object with a 'crops' array containing the names. Use common names like "Wheat", "Rice", "Maize".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              crops: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["crops"]
          }
        }
      });

      const data = JSON.parse(response.text || '{"crops":[]}');
      const recommendedCrops = data.crops || [];
      setCrops(recommendedCrops);

      // Generate accurate images for each crop
      setStatus('generating_images');
      const imagePromises = recommendedCrops.map(async (crop: string) => {
        try {
          const imgResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [{ text: `A professional, high-quality agricultural photograph of a ${crop} crop plant growing in a field. Focus on the plant's natural appearance and its harvestable parts (like grains, fibers, or fruits). Realistic style, natural lighting.` }]
            },
            config: {
              imageConfig: {
                aspectRatio: "3:4"
              }
            }
          });

          for (const part of imgResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              return { crop, url: `data:image/png;base64,${part.inlineData.data}` };
            }
          }
        } catch (err) {
          console.error(`Failed to generate image for ${crop}:`, err);
        }
        // Fallback to a better flickr URL if AI generation fails
        return { crop, url: `https://loremflickr.com/800/1200/${crop},plant,agriculture/all` };
      });

      const images = await Promise.all(imagePromises);
      const imageMap = images.reduce((acc, curr) => ({ ...acc, [curr.crop]: curr.url }), {});
      setCropImages(imageMap);

    } catch (error) {
      console.error("AI Recommendation Error:", error);
      setCrops([]);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  if (!sensorData || !t) return null;

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-stone-900 font-sans selection:bg-emerald-100 relative overflow-x-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-100/30 rounded-full blur-[150px] -mr-96 -mt-96 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-100/20 rounded-full blur-[150px] -ml-96 -mb-96 pointer-events-none" />

      <header className="sticky top-0 z-50 bg-[#F8F7F4]/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.1, x: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/')}
              className="p-3 bg-white rounded-xl border border-black/5 text-stone-600 hover:text-emerald-600 transition-all shadow-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Back</span>
            </motion.button>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={getRecommendation}
                disabled={loading}
                className="p-3 bg-white rounded-xl border border-black/5 text-stone-600 hover:text-emerald-600 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight leading-none">{t.cropRecommendation}</h1>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">AI Intelligence</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Context Stats */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-stone-900">Analysis Context</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: Calendar, label: t.month, value: new Date().toLocaleString('default', { month: 'short' }), color: 'text-blue-600' },
                { icon: MapPin, label: t.location, value: location ? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}` : t.unknown, color: 'text-red-600' },
                { icon: Droplets, label: 'Moisture', value: `${sensorData.soilMoisture}%`, color: 'text-cyan-600' },
                { icon: Thermometer, label: 'Temp', value: `${sensorData.temperature}°C`, color: 'text-orange-600' },
                { icon: FlaskConical, label: 'pH', value: sensorData.phValue, color: 'text-purple-600' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-6 bg-white rounded-[2rem] border border-black/5 flex flex-col items-center text-center shadow-sm"
                >
                  <item.icon className={`w-6 h-6 mb-3 ${item.color}`} />
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{item.label}</span>
                  <span className="text-base font-black text-stone-900">{item.value}</span>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Recommendations Grid */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Sprout className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-stone-900">{t.recommendedCrops}</h2>
              </div>
              {!loading && crops.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSpeak}
                  disabled={isSpeaking}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50"
                >
                  {isSpeaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  <span>{t.listen}</span>
                </motion.button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-6 bg-white rounded-[3rem] border border-black/5 shadow-sm">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
                  <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-stone-900 font-black uppercase tracking-[0.3em] text-sm mb-2">
                    {status === 'generating_images' ? 'Visualizing Crops' : t.analyzingData}
                  </p>
                  <p className="text-stone-400 text-xs font-bold">
                    {status === 'generating_images' 
                      ? 'Generating accurate crop visuals...' 
                      : 'Consulting agricultural database...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {crops.map((crop, idx) => (
                  <motion.div
                    key={crop}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.15, type: "spring", stiffness: 100 }}
                    className="group relative bg-white rounded-[3rem] overflow-hidden border border-black/5 shadow-sm hover:shadow-2xl transition-all duration-500"
                  >
                    <div className="aspect-[3/4] overflow-hidden relative">
                      {cropImages[crop] ? (
                        <img 
                          src={cropImages[crop]} 
                          alt={crop}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-100 animate-pulse flex items-center justify-center">
                          <Sprout className="w-12 h-12 text-stone-200" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                      
                      <div className="absolute inset-0 p-8 flex flex-col justify-end items-center text-center">
                        <h4 className="text-4xl font-black text-white tracking-tight drop-shadow-xl uppercase">{crop}</h4>
                        <div className="w-16 h-1.5 bg-emerald-500 rounded-full mt-4 transform origin-center group-hover:scale-x-150 transition-transform duration-500" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </motion.div>
      </main>
    </div>
  );
};
