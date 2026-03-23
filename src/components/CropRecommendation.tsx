import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { SensorData, Translation, Language } from '../types';

interface CropRecommendationProps {
  sensorData: SensorData;
  t: Translation;
  language: Language;
}

export const CropRecommendation: React.FC<CropRecommendationProps> = ({ sensorData, t, language }) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/recommendations', { state: { sensorData, t, language } });
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleNavigate}
      className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 border-transparent hover:border-emerald-600"
    >
      <Sparkles className="w-3.5 h-3.5" />
      <span>{t.cropRecommendation}</span>
    </motion.button>
  );
};
