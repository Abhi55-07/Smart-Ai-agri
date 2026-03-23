import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Power, Zap, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface ControlCardProps {
  title: string;
  status: boolean;
  onToggle: () => void;
  labelOn: string;
  labelOff: string;
}

export const ControlCard: React.FC<ControlCardProps> = ({ title, status, onToggle, labelOn, labelOff }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={cn(
        "rounded-[2.5rem] p-8 transition-all duration-700 flex flex-col justify-between h-full relative overflow-hidden group shadow-sm hover:shadow-2xl",
        status 
          ? "bg-emerald-600 text-white" 
          : "bg-white border border-black/5 text-stone-950"
      )}
    >
      {/* Background Animation for Active State */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-400/20 rounded-full blur-[60px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start relative z-10">
        <motion.div 
          animate={status ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            "p-4 rounded-2xl transition-all duration-500",
            status ? "bg-white/20 backdrop-blur-md" : "bg-stone-50"
          )}
        >
          <Power className={cn("w-6 h-6", status ? "text-white" : "text-stone-400")} />
        </motion.div>
        <div className="flex flex-col items-end gap-1">
          <div className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em]",
            status ? "text-emerald-100" : "text-stone-400"
          )}>
            {status ? labelOn : labelOff}
          </div>
          {status && (
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [4, 12, 4] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 bg-white/40 rounded-full"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Activity className={cn("w-3 h-3", status ? "text-emerald-200" : "text-stone-300")} />
          <h3 className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em]",
            status ? "text-emerald-100" : "text-stone-400"
          )}>
            {title}
          </h3>
        </div>
        
        <div className="flex items-center gap-3 mb-8">
          <div className={cn(
            "text-3xl font-black tracking-tighter",
            status ? "text-white" : "text-stone-950"
          )}>
            {status ? 'Active' : 'Standby'}
          </div>
          {status && (
            <motion.div
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            />
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          className={cn(
            "w-full py-5 rounded-2xl font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 group/btn",
            status 
              ? "bg-white text-emerald-600 shadow-xl shadow-emerald-900/40" 
              : "bg-stone-950 text-white shadow-xl shadow-stone-950/20"
          )}
        >
          <Zap className={cn("w-4 h-4 transition-transform group-hover/btn:scale-125", status ? "text-emerald-600" : "text-emerald-400")} />
          {status ? 'STOP SYSTEM' : 'START SYSTEM'}
        </motion.button>
      </div>

      {/* Decorative Icon */}
      <Power className={cn(
        "absolute -bottom-10 -left-10 w-40 h-40 transition-all duration-700 opacity-5",
        status ? "text-white rotate-12" : "text-stone-950 -rotate-12"
      )} />
    </motion.div>
  );
};
