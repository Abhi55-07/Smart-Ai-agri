import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sprout, Mail, Lock, Loader2, ArrowRight, Sun, Moon, Cloud } from 'lucide-react';
import { supabase } from '../lib/supabase';

const WheatStalk = ({ x, delay, height, color }: { x: number; delay: number; height: number; color: string }) => (
  <motion.div
    className="absolute bottom-0 origin-bottom"
    style={{ left: `${x}%`, height: `${height}px` }}
    animate={{ 
      rotate: [-3, 5, -3],
      skewX: [-2, 4, -2]
    }}
    transition={{ 
      duration: 3 + Math.random() * 2, 
      repeat: Infinity, 
      delay, 
      ease: "easeInOut" 
    }}
  >
    <svg width="15" height={height} viewBox="0 0 15 100" preserveAspectRatio="none">
      <path 
        d="M7.5 100 Q 7.5 50 7.5 0 M7.5 15 L12 10 M7.5 25 L3 20 M7.5 35 L12 30 M7.5 45 L3 40" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        fill="none" 
        className={color}
      />
    </svg>
  </motion.div>
);

const MovingCloud = ({ delay, y, size, duration }: { delay: number; y: number; size: number; duration: number }) => (
  <motion.div
    initial={{ x: '-20vw', opacity: 0 }}
    animate={{ 
      x: '120vw',
      opacity: [0, 0.8, 0.8, 0]
    }}
    transition={{ 
      duration, 
      repeat: Infinity, 
      delay, 
      ease: "linear" 
    }}
    className="absolute text-white/40"
    style={{ top: `${y}%` }}
  >
    <Cloud size={size} fill="currentColor" />
  </motion.div>
);

const StarField = () => (
  <div className="absolute inset-0 z-0">
    {[...Array(80)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute bg-white rounded-full"
        style={{ 
          top: `${Math.random() * 50}%`, 
          left: `${Math.random() * 100}%`, 
          width: Math.random() * 2 + 1, 
          height: Math.random() * 2 + 1 
        }}
        animate={{ opacity: [0.1, 0.8, 0.1], scale: [1, 1.2, 1] }}
        transition={{ duration: 2 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5 }}
      />
    ))}
  </div>
);

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isDay = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // If identities is empty, it means the user already exists (Supabase enumeration protection)
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError('An account with this email already exists. Please sign in instead.');
          return;
        }

        setMessage('Account created successfully! Please sign in.');
        setIsSignUp(false);
        setPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { staggerChildren: 0.1, delayChildren: 0.4, type: "spring" as const, damping: 20 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 120 }
    }
  };

  return (
    <div className={`min-h-screen relative flex items-center justify-center p-6 overflow-hidden transition-colors duration-1000 ${isDay ? 'bg-sky-50' : 'bg-stone-950'}`}>
      
      {/* Dynamic Sky */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isDay ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-100" />
        {[...Array(6)].map((_, i) => (
          <MovingCloud key={i} delay={i * 8} y={10 + i * 10} size={60 + i * 20} duration={40 + i * 10} />
        ))}
        <motion.div 
          animate={{ y: [0, -15, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 right-16 text-yellow-300"
        >
          <Sun size={140} fill="currentColor" className="drop-shadow-[0_0_50px_rgba(253,224,71,0.6)]" />
        </motion.div>
      </div>

      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isDay ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-indigo-950 to-stone-900" />
        <StarField />
        <motion.div 
          animate={{ y: [0, 15, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-24 text-stone-100"
        >
          <Moon size={110} fill="currentColor" className="drop-shadow-[0_0_60px_rgba(255,255,255,0.3)]" />
        </motion.div>
      </div>

      {/* Realistic Swaying Crop Field */}
      <div className="absolute inset-x-0 bottom-0 h-[45vh] z-10 overflow-hidden pointer-events-none">
        {/* Background layer of crops */}
        {[...Array(120)].map((_, i) => (
          <WheatStalk 
            key={`bg-${i}`} 
            x={(i / 120) * 100} 
            delay={Math.random() * 4} 
            height={150 + Math.random() * 100} 
            color={isDay ? "text-emerald-600/30" : "text-emerald-900/40"}
          />
        ))}
        {/* Mid layer */}
        {[...Array(100)].map((_, i) => (
          <WheatStalk 
            key={`mid-${i}`} 
            x={(i / 100) * 100 + 0.5} 
            delay={Math.random() * 3} 
            height={180 + Math.random() * 120} 
            color={isDay ? "text-lime-600/40" : "text-emerald-800/50"}
          />
        ))}
        {/* Foreground layer */}
        {[...Array(80)].map((_, i) => (
          <WheatStalk 
            key={`fg-${i}`} 
            x={(i / 80) * 100 + 1} 
            delay={Math.random() * 2} 
            height={220 + Math.random() * 150} 
            color={isDay ? "text-lime-500/60" : "text-emerald-700/60"}
          />
        ))}
        
        {/* Ground Gradient for depth */}
        <div className={`absolute inset-0 bg-gradient-to-t ${isDay ? 'from-emerald-900/20' : 'from-black/40'} via-transparent to-transparent`} />
      </div>

      {/* Wind Particles */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: '-20vw', y: `${20 + Math.random() * 60}vh`, opacity: 0 }}
            animate={{ 
              x: '120vw', 
              y: [`${20 + Math.random() * 60}vh`, `${20 + Math.random() * 60}vh`],
              opacity: [0, 0.4, 0] 
            }}
            transition={{ 
              duration: 8 + Math.random() * 8, 
              repeat: Infinity, 
              delay: Math.random() * 10,
              ease: "linear"
            }}
            className="absolute w-2 h-0.5 bg-white/30 rounded-full blur-[2px]"
          />
        ))}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`max-w-md w-full ${isDay ? 'bg-white/85' : 'bg-white/95'} backdrop-blur-[40px] rounded-[4rem] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/60 relative z-20`}
      >
        <motion.div variants={itemVariants} className="flex flex-col items-center mb-12">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.15 }}
            className="w-24 h-24 bg-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-900/40 mb-8"
          >
            <Sprout className="w-14 h-14 text-white" />
          </motion.div>
          <motion.h1 className="text-5xl font-black tracking-tighter text-stone-950">Smart IoT Agriculture</motion.h1>
          <motion.p className="text-stone-600 font-bold uppercase tracking-[0.4em] text-[11px] mt-4">Farmer IoT Ecosystem</motion.p>
        </motion.div>

        <form onSubmit={handleAuth} className="space-y-8">
          <motion.div variants={itemVariants} className="space-y-3">
            <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-8 py-6 bg-stone-50/50 rounded-3xl border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all text-stone-950 placeholder:text-stone-400 outline-none font-semibold text-lg"
              placeholder="farmer@example.com"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <label className="text-[11px] font-black text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-8 py-6 bg-stone-50/50 rounded-3xl border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all text-stone-950 placeholder:text-stone-400 outline-none font-semibold text-lg"
              placeholder="••••••••"
            />
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-red-500 text-sm font-bold bg-red-50 p-5 rounded-3xl border border-red-100 flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {error}
              </motion.div>
            )}
            {message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-emerald-600 text-sm font-bold bg-emerald-50 p-5 rounded-3xl border border-emerald-100 flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black tracking-[0.25em] text-sm flex items-center justify-center gap-4 hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-900/30 disabled:opacity-50 group"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </motion.button>
        </form>

        <motion.div variants={itemVariants} className="mt-12 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[11px] font-black text-stone-500 hover:text-emerald-600 transition-colors uppercase tracking-[0.25em] relative group"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-emerald-600 transition-all group-hover:w-full" />
          </button>
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 text-[11px] font-black uppercase tracking-[0.6em] z-20 ${isDay ? 'text-stone-600' : 'text-white/60'}`}
      >
        Sustainable Agriculture Technology
      </motion.div>
    </div>
  );
};
