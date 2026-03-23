import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Line
} from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, Activity, PieChart as PieIcon, BarChart3, Zap, Target, Share2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AnalyticsDashboard: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [phStats, setPhStats] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    console.log("AnalyticsDashboard mounted, setting up subscription...");
    
    let channel: any;

    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("No session found in AnalyticsDashboard");
        setLoading(false);
        return;
      }

      console.log("Fetching initial analytics data for user:", session.user.id);
      fetchData(session.user.id);

      channel = supabase
        .channel('analytics_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_readings',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log("New analytics point received via realtime:", payload.new);
            const d = payload.new;
            const newPoint = {
              name: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              moisture: d.soil_moisture,
              temp: d.temperature,
              humidity: d.humidity,
              nutrients: d.light ?? 0
            };
            
            setChartData(prev => {
              const updated = [...prev, newPoint];
              if (updated.length > 50) return updated.slice(1);
              return updated;
            });

            if (d.ph_value !== undefined) {
              setPhStats(prev => {
                const updatedStats = [...prev];
                if (updatedStats.length === 0) return prev;
                if (d.ph_value < 6) updatedStats[0].value++;
                else if (d.ph_value <= 7.5) updatedStats[1].value++;
                else updatedStats[2].value++;
                return updatedStats;
              });
            }
          }
        )
        .subscribe((status) => {
          console.log("Analytics subscription status:", status);
        });
    };

    setupSubscription();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log(`Fetched ${data?.length || 0} historical points`);

      if (data && data.length > 0) {
        const formattedData = [...data].reverse().map(d => ({
          name: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          moisture: d.soil_moisture,
          temp: d.temperature,
          humidity: d.humidity,
          nutrients: d.light ?? 0
        }));
        setChartData(formattedData);

        // Calculate pH distribution
        const phValues = data.map(d => d.ph_value).filter(v => v !== null && v !== undefined);
        const acidic = phValues.filter(v => v < 6).length;
        const optimal = phValues.filter(v => v >= 6 && v <= 7.5).length;
        const alkaline = phValues.filter(v => v > 7.5).length;
        
        setPhStats([
          { name: 'Acidic', value: acidic || 0, color: '#ef4444' },
          { name: 'Optimal', value: optimal || 0, color: '#10b981' },
          { name: 'Alkaline', value: alkaline || 0, color: '#8b5cf6' },
        ]);
      } else {
        // Set empty but initialized stats
        setPhStats([
          { name: 'Acidic', value: 0, color: '#ef4444' },
          { name: 'Optimal', value: 0, color: '#10b981' },
          { name: 'Alkaline', value: 0, color: '#8b5cf6' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-white rounded-[3rem] border border-black/5 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Loading Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-black uppercase tracking-[0.3em] text-stone-950">Ecosystem Intelligence</h2>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) fetchData(session.user.id);
            }}
            className="p-2 bg-white rounded-xl border border-black/5 text-stone-400 hover:text-emerald-600 transition-colors shadow-sm"
            title="Refresh Analytics"
          >
            <Share2 className="w-4 h-4" />
          </motion.button>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Live Analysis</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Composed Chart: Multi-Metric Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm hover:shadow-2xl transition-all duration-700 group col-span-1 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:rotate-12 transition-transform duration-500">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-950 tracking-tight">Holistic Growth Analysis</h3>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Moisture vs Nutrients vs Humidity</p>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            {isMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis 
                    dataKey="name" 
                    type="category"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#a8a29e' }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#a8a29e' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold', padding: '16px' }} 
                  />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" formatter={(value) => <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-2">{value}</span>} />
                  <Area type="monotone" dataKey="moisture" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.1} animationDuration={2000} />
                  <Bar dataKey="nutrients" barSize={20} fill="#10b981" radius={[10, 10, 0, 0]} animationDuration={1500} />
                  <Line type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={4} dot={{ r: 6, fill: '#06b6d4', strokeWidth: 2, stroke: '#fff' }} animationDuration={2500} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-400 font-bold uppercase tracking-widest text-xs">
                Waiting for sensor data...
              </div>
            )}
          </div>
        </motion.div>

        {/* Pie Chart: Soil Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm hover:shadow-2xl transition-all duration-700 group"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <PieIcon size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-950 tracking-tight">Soil Health Index</h3>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">pH Level Composition</p>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            {isMounted && phStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={phStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={10}
                    dataKey="value"
                    animationDuration={2000}
                  >
                    {phStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-400 font-bold uppercase tracking-widest text-xs">
                No pH data recorded
              </div>
            )}
          </div>
        </motion.div>

        {/* Climate Correlation */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-sm hover:shadow-2xl transition-all duration-700 group"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:rotate-12 transition-transform">
                <Share2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-950 tracking-tight">Climate Correlation</h3>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Temp vs Humidity</p>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            {isMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis 
                  type="number" 
                  dataKey="temp" 
                  name="Temperature" 
                  unit="°C" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#a8a29e' }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <YAxis 
                  type="number" 
                  dataKey="humidity" 
                  name="Humidity" 
                  unit="%" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#a8a29e' }}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <ZAxis type="number" range={[100, 1000]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                <Scatter name="Climate" data={chartData} fill="#f97316" animationDuration={2000} />
              </ScatterChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-400 font-bold uppercase tracking-widest text-xs">
                Insufficient climate data
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
