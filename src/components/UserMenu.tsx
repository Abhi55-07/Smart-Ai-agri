import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  LogOut, 
  Globe, 
  HeadphonesIcon, 
  ChevronDown,
  User,
  Check
} from 'lucide-react';
import { Language, Translation } from '../types';
import { speak } from '../services/ttsService';
import { Volume2, Loader2 } from 'lucide-react';

interface UserMenuProps {
  userEmail: string;
  language: Language;
  setLanguage: (lang: Language) => void;
  onLogout: () => void;
  t: Translation;
}

export const UserMenu: React.FC<UserMenuProps> = ({ 
  userEmail, 
  language, 
  setLanguage, 
  onLogout,
  t 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages: { code: Language; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'mr', name: 'मराठी' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'gu', name: 'ગુજરાતી' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ' },
    { code: 'ml', name: 'മലയാളം' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' }
  ];

  const handleSpeak = async (e: React.MouseEvent, langCode: Language, text: string) => {
    e.stopPropagation();
    setIsSpeaking(langCode);
    await speak(text, langCode);
    setIsSpeaking(null);
  };

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-black/5 shadow-sm">
          <User className="w-4 h-4 text-stone-400" />
          <span className="text-xs font-bold text-stone-600">{userEmail}</span>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`p-3 rounded-xl border border-black/5 transition-all shadow-sm ${
            isOpen ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:text-stone-900'
          }`}
        >
          <Settings className={`w-5 h-5 ${isOpen ? 'rotate-90' : ''} transition-transform duration-300`} />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-black/5 overflow-hidden z-[100]"
          >
            <div className="p-4 border-b border-black/5 bg-stone-50/50">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Account</p>
              <p className="text-xs font-bold text-stone-900 truncate">{userEmail}</p>
            </div>

            <div className="p-2">
              {/* Language Section */}
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">
                  <Globe className="w-3 h-3" />
                  {t.language}
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all group/lang ${
                        language === lang.code 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'hover:bg-stone-50 text-stone-600'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {lang.name}
                        {language === lang.code && <Check className="w-3 h-3" />}
                      </span>
                      <div 
                        onClick={(e) => handleSpeak(e, lang.code, lang.name)}
                        className={`p-1 rounded-md hover:bg-white transition-colors ${isSpeaking === lang.code ? 'text-emerald-600' : 'text-stone-400 opacity-0 group-hover/lang:opacity-100'}`}
                      >
                        {isSpeaking === lang.code ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-black/5 my-2 mx-2" />

              {/* Support Option */}
              <button 
                onClick={() => window.open('mailto:support@smartiotagriculture.io')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all group"
              >
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <HeadphonesIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold">{t.customerSupport}</span>
              </button>

              <div className="h-px bg-black/5 my-2 mx-2" />

              {/* Logout Option */}
              <button 
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all group"
              >
                <div className="p-2 bg-red-50 rounded-lg text-red-500 group-hover:bg-red-100 transition-colors">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold">{t.logout}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
