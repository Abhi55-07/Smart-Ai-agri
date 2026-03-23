import { GoogleGenAI, Modality } from "@google/genai";
import { Language } from "../types";

const VOICE_MAPPING: Record<Language, string> = {
  en: 'Zephyr',
  hi: 'Kore',
  mr: 'Kore',
  te: 'Puck',
  ta: 'Puck',
  kn: 'Puck',
  gu: 'Kore',
  bn: 'Kore',
  pa: 'Fenrir',
  ml: 'Puck',
  es: 'Charon',
  fr: 'Charon'
};

export const speak = async (text: string, language: Language) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
    const voiceName = VOICE_MAPPING[language] || 'Zephyr';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak this in ${language}: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioSrc = `data:audio/wav;base64,${base64Audio}`;
      const audio = new Audio(audioSrc);
      await audio.play();
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
};
