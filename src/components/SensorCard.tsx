import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SensorCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

// Mock data for sparkline
const sparkData = [
  { v: 40 }, { v: 45 }, { v: 42 }, { v: 48 }, { v: 46 }, { v: 50 }, { v: 48 }
];

export const SensorCard: React.FC<SensorCardProps> = ({ title, value, unit, icon: Icon, color, trend }) => {
  const chartColor = color.includes('blue') ? '#3b82f6' : 
                     color.includes('purple') ? '#8b5cf6' : 
                     color.includes('orange') ? '#f97316' : 
                     color.includes('cyan') ? '#06b6d4' : '#10b981';

  // Calculate percentage for the progress bar
  const numericValue = Number(value);
  const percentage = isNaN(numericValue) ? 0 : Math.min(Math.max(numericValue, 0), 100);

  // Generate slightly dynamic sparkline data based on value
  const dynamicSparkData = [
    { v: 40 }, { v: 45 }, { v: 42 }, { v: 48 }, { v: 46 }, { v: 50 }, { v: numericValue || 48 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5 flex flex-col justify-between h-full group hover:shadow-xl transition-all duration-500"
    >
      <div className="flex justify-between items-start">
        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-500", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">{title}</h3>
        <div className="flex items-baseline gap-1">
          <motion.span 
            key={String(value)}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-black tracking-tighter text-stone-950"
          >
            {isNaN(numericValue) ? '--' : value}
          </motion.span>
          {unit && <span className="text-xl font-bold text-stone-300">{unit}</span>}
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div className="flex-1 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dynamicSparkData}>
              <Line 
                type="monotone" 
                dataKey="v" 
                stroke={chartColor} 
                strokeWidth={3} 
                dot={false}
                animationDuration={2000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">
          Live<br/>Data
        </div>
      </div>

      <div className="mt-6 h-1.5 w-full bg-stone-50 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
          className={cn("h-full", color)}
        />
      </div>
    </motion.div>
  );
};
