import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Droplets, 
  Thermometer, 
  Wind, 
  FlaskConical, 
  Sprout, 
  Bell,
  LayoutDashboard,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { cn } from './lib/utils';
import { SensorCard } from './components/SensorCard';
import { ControlCard } from './components/ControlCard';
import { DiseaseAnalyzer } from './components/DiseaseAnalyzer';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { Auth } from './components/Auth';
import { UserMenu } from './components/UserMenu';
import { CropRecommendation } from './components/CropRecommendation';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { TRANSLATIONS } from './constants';
import { Language, SensorData } from './types';
import { getBlynkPinValue, updateBlynkPinValue, triggerN8NWebhook } from './services/blynkService';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [sensorData, setSensorData] = useState<SensorData>({
    soilMoisture: 45,
    phValue: 6.8,
    waterPumpStatus: false,
    temperature: 24,
    humidity: 60,
    light: 85
  });
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [lastSensorUpdate, setLastSensorUpdate] = useState<Date | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = React.useRef<any>(null);

  const saveSensorReadings = useCallback(async (data: SensorData) => {
    if (!session) return;
    
    console.log("💾 [Supabase] Attempting to save sensor readings:", data);
    try {
      const { error } = await supabase
        .from('sensor_readings')
        .insert([
          {
            user_id: session.user.id,
            soil_moisture: data.soilMoisture,
            ph_value: data.phValue,
            temperature: data.temperature,
            humidity: data.humidity,
            light: data.light,
            pump_status: data.waterPumpStatus,
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error) {
        console.error('Supabase Insert Error:', error.message, error.details);
        throw error;
      }
      console.log("✅ [Supabase] Data saved successfully");
      setWebhookStatus('success');
    } catch (error) {
      console.error('Supabase Save Error:', error);
      setWebhookStatus('error');
    }
  }, [session]);

  const connectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log("Attempting to connect socket to:", window.location.origin);
    // Force websocket transport as polling often fails behind proxies
    const socket = io(window.location.origin, {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("Socket connected successfully via websocket");
      setIsSocketConnected(true);
    });

    socket.on('connect_error', (err) => {
      console.error("Socket connection error:", err.message);
      // If websocket fails, try polling as a fallback
      if (socket.io.opts.transports?.[0] === 'websocket') {
        console.log("Falling back to polling...");
        socket.io.opts.transports = ['polling', 'websocket'];
      }
    });

    socket.on('disconnect', (reason) => {
      console.log("Socket disconnected:", reason);
      setIsSocketConnected(false);
    });

    socket.on('new-camera-image', (data: { image: string }) => {
      console.log("New image received from ESP32-CAM globally. Length:", data.image?.length);
      
      if (!data.image) {
        console.error("Received empty image data");
        return;
      }

      // Clean the image string (remove quotes, equals signs, whitespace, newlines)
      let cleanImage = data.image.trim().replace(/^["'=]+|["']+$/g, '').replace(/\s/g, '');
      console.log("Cleaned image starts with:", cleanImage.substring(0, 30));
      
      // If it's already a data URL (after cleaning), use it
      if (cleanImage.startsWith('data:')) {
        setCameraImage(cleanImage);
        return;
      }

      // Detect mime type from base64 header if possible
      let mimeType = 'image/jpeg';
      if (cleanImage.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
      else if (cleanImage.startsWith('R0lGOD')) mimeType = 'image/gif';
      else if (cleanImage.startsWith('UklGR')) mimeType = 'image/webp';
      
      const formattedImage = `data:${mimeType};base64,${cleanImage}`;
      setCameraImage(formattedImage);
    });

    socket.on('new-sensor-data', (data: Partial<SensorData>) => {
      console.log("📡 [Socket] New sensor data received:", data);
      
      // Basic validation to ensure we have at least one valid key
      if (Object.keys(data).length === 0) {
        console.warn("Received empty sensor data object");
        return;
      }

      setLastSensorUpdate(new Date());
      setSensorData(prev => {
        const newData = {
          ...prev,
          ...data
        };
        // Save to Supabase if session exists
        if (session) {
          saveSensorReadings(newData);
        }
        return newData;
      });
    });
  }, [session, saveSensorReadings]);

  useEffect(() => {
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connectSocket]);

  useEffect(() => {
    if (!session) return;

    // Subscribe to real-time changes in sensor_readings
    const channel = supabase
      .channel('sensor_readings_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Real-time sensor reading received:', payload.new);
          const data = payload.new;
          setLastSensorUpdate(new Date());
          setSensorData(prev => ({
            ...prev,
            soilMoisture: data.soil_moisture ?? prev.soilMoisture,
            phValue: data.ph_value ?? prev.phValue,
            temperature: data.temperature ?? prev.temperature,
            humidity: data.humidity ?? prev.humidity,
            light: data.light ?? prev.light,
            waterPumpStatus: data.pump_status ?? prev.waterPumpStatus
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const currentTime = new Date();
  const greeting = currentTime.getHours() < 12 ? 'Good Morning' : currentTime.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const t = TRANSLATIONS[language];

  const fetchBlynkData = useCallback(async () => {
    // Function kept for reference but not used in direct sensor mode
    console.log("Blynk fetch skipped in direct mode");
  }, []);

  useEffect(() => {
    if (!session) return;
    // Removed Blynk polling to read directly from sensor stream via Supabase Realtime/Socket.io
    // const interval = setInterval(fetchBlynkData, 10000);
    // return () => clearInterval(interval);
  }, [session]);

  const syncSensorsToSupabase = async () => {
    await saveSensorReadings(sensorData);
  };

  const togglePump = async () => {
    const newStatus = !sensorData.waterPumpStatus;
    setSensorData(prev => ({ ...prev, waterPumpStatus: newStatus }));
    
    await updateBlynkPinValue('V3', newStatus ? '1' : '0');

    // Send manual control signal to n8n
    await triggerN8NWebhook({
      event: 'pump_control',
      action: newStatus ? 'on' : 'off',
      source: 'manual_button',
      timestamp: new Date().toISOString()
    });

    // Log pump toggle to Supabase
    await saveSensorReadings({
      ...sensorData,
      waterPumpStatus: newStatus
    });
  };

  useEffect(() => {
    if (!session) return;

    if (sensorData.soilMoisture < 20) {
      // Low moisture - Start Pump signal to n8n
      triggerN8NWebhook({
        event: 'pump_control',
        action: 'on',
        source: 'auto_moisture_low',
        value: sensorData.soilMoisture,
        sensors: {
          soilMoisture: sensorData.soilMoisture,
          phValue: sensorData.phValue,
          humidity: sensorData.humidity,
          temperature: sensorData.temperature,
          light: sensorData.light
        },
        timestamp: new Date().toISOString(),
        user: session.user.email
      }).then(success => setWebhookStatus(success ? 'success' : 'error'));
    } else if (sensorData.soilMoisture > 80) {
      // High moisture - Stop Pump signal to n8n
      triggerN8NWebhook({
        event: 'pump_control',
        action: 'off',
        source: 'auto_moisture_high',
        value: sensorData.soilMoisture,
        sensors: {
          soilMoisture: sensorData.soilMoisture,
          phValue: sensorData.phValue,
          humidity: sensorData.humidity,
          temperature: sensorData.temperature,
          light: sensorData.light
        },
        timestamp: new Date().toISOString(),
        user: session.user.email
      }).then(success => setWebhookStatus(success ? 'success' : 'error'));
    }
  }, [sensorData.soilMoisture, session]);

  const syncFromN8N = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/n8n-sync');
      const result = await response.json();
      if (response.ok) {
        console.log('n8n sync success:', result);
      } else {
        console.error('n8n sync failed:', result.error);
      }
    } catch (error) {
      console.error('n8n sync error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard 
          session={session}
          language={language}
          setLanguage={setLanguage}
          isRefreshing={isRefreshing}
          webhookStatus={webhookStatus}
          sensorData={sensorData}
          cameraImage={cameraImage}
          setCameraImage={setCameraImage}
          isSocketConnected={isSocketConnected}
          reconnectSocket={connectSocket}
          handleLogout={handleLogout}
          fetchBlynkData={fetchBlynkData}
          togglePump={togglePump}
          syncSensors={syncSensorsToSupabase}
          syncFromN8N={syncFromN8N}
          lastSensorUpdate={lastSensorUpdate}
          t={t}
        />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

const Dashboard = ({ 
  session, language, setLanguage, 
  isRefreshing, webhookStatus, 
  sensorData, cameraImage, setCameraImage, isSocketConnected, reconnectSocket,
  handleLogout, fetchBlynkData, togglePump, 
  syncSensors, syncFromN8N, lastSensorUpdate, t 
}: any) => {
  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-stone-900 font-sans selection:bg-emerald-100 relative overflow-x-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-100/30 rounded-full blur-[150px] -mr-96 -mt-96 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-100/20 rounded-full blur-[150px] -ml-96 -mb-96 pointer-events-none" />

      {/* Floating Particles for Dashboard */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + 'vw', 
              y: Math.random() * 100 + 'vh', 
              opacity: 0,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
              y: [null, Math.random() * 100 + 'vh'],
              opacity: [0, 0.2, 0] 
            }}
            transition={{ 
              duration: 15 + Math.random() * 20, 
              repeat: Infinity, 
              ease: "linear"
            }}
            className="absolute w-4 h-4 bg-emerald-500/10 rounded-full blur-xl"
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F8F7F4]/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 180 }}
              className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20"
            >
              <Sprout className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">Smart IoT Agriculture</h1>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Advanced IoT Ecosystem</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={cn(
              "px-3 py-1.5 rounded-full flex items-center gap-2 border transition-colors",
              isSocketConnected 
                ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                : "bg-red-50 border-red-100 text-red-600"
            )}>
              <div className={cn("w-2 h-2 rounded-full", isSocketConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isSocketConnected ? 'Live Connection Active' : 'Connection Lost'}
              </span>
            </div>

            <AnimatePresence>
              {cameraImage && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-600"
                >
                  <Camera className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">New Image Ready</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ rotate: 180 }}
              onClick={fetchBlynkData}
              className="p-3 bg-white rounded-xl border border-black/5 text-black/40 hover:text-black transition-colors shadow-sm"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>

            <CropRecommendation 
              sensorData={sensorData}
              t={t}
              language={language}
            />
            
            <UserMenu 
              userEmail={session.user.email || ''}
              language={language}
              setLanguage={setLanguage}
              onLogout={handleLogout}
              t={t}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-5xl font-black tracking-tighter text-stone-950 mb-2">
                {greeting}, <span className="text-emerald-600">Farmer</span>
              </h2>
              <p className="text-stone-500 font-bold uppercase tracking-[0.3em] text-xs">
                Your farm is currently <span className="text-emerald-600">performing optimally</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-6 py-4 bg-white rounded-[2rem] border border-black/5 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Active Alerts</p>
                  <p className="text-sm font-black text-stone-900">0 Notifications</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-8">
          
          {/* Main Dashboard Content */}
          <div className="space-y-12">
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-stone-900">{t.dashboard}</h2>
                  <button 
                    onClick={() => {
                      fetch('/api/sensor-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ soilMoisture: Math.floor(Math.random() * 100) })
                      });
                    }}
                    className="ml-4 px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-[8px] font-black uppercase tracking-widest text-stone-400 transition-colors"
                  >
                    Simulate Sensor
                  </button>
                </div>
                <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                  {lastSensorUpdate ? `Last Updated: ${lastSensorUpdate.toLocaleTimeString()}` : `Live Feed • ${new Date().toLocaleTimeString()}`}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SensorCard 
                  title="Direct Sensor Feed"
                  value={sensorData.soilMoisture}
                  unit="%"
                  icon={Droplets}
                  color="bg-blue-500"
                  trend="stable"
                />
                <div className="relative">
                  <SensorCard 
                    title="n8n pH Monitor"
                    value={sensorData.phValue}
                    unit="pH"
                    icon={FlaskConical}
                    color="bg-purple-500"
                    trend="up"
                  />
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">n8n Active</span>
                    </div>
                    <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">
                      Live Stream
                    </span>
                  </div>
                </div>
                <ControlCard 
                  title={t.waterPump}
                  status={sensorData.waterPumpStatus}
                  onToggle={togglePump}
                  labelOn={t.on}
                  labelOff={t.off}
                />
                <SensorCard 
                  title="Temperature"
                  value={sensorData.temperature}
                  unit="°C"
                  icon={Thermometer}
                  color="bg-orange-500"
                />
                <SensorCard 
                  title="Humidity"
                  value={sensorData.humidity}
                  unit="%"
                  icon={Wind}
                  color="bg-cyan-500"
                />
              </div>
            </section>

            <AnalyticsDashboard />

            <section>
              <DiseaseAnalyzer 
                t={t} 
                language={language} 
                cameraImage={cameraImage} 
                setCameraImage={setCameraImage} 
                isSocketConnected={isSocketConnected}
                reconnectSocket={reconnectSocket}
              />
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            © 2024 Smart IoT Agriculture Platform. All rights reserved.
          </div>
          <div className="flex gap-8">
            {['Documentation', 'Support', 'Privacy'].map((item) => (
              <a key={item} href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 hover:text-emerald-600 transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
