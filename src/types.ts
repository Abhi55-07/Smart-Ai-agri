export type Language = 'en' | 'hi' | 'mr' | 'te' | 'ta' | 'kn' | 'gu' | 'bn' | 'pa' | 'ml' | 'es' | 'fr';

export interface SensorData {
  soilMoisture: number;
  phValue: number;
  waterPumpStatus: boolean;
  temperature: number;
  humidity: number;
  light: number;
}

export interface Translation {
  dashboard: string;
  soilMoisture: string;
  phLevel: string;
  waterPump: string;
  diseaseAnalysis: string;
  analyzeImage: string;
  settings: string;
  blynkToken: string;
  n8nWebhook: string;
  status: string;
  on: string;
  off: string;
  loading: string;
  uploadImage: string;
  analysisResult: string;
  language: string;
  customerSupport: string;
  logout: string;
  cropRecommendation: string;
  getRecommendation: string;
  analyzingData: string;
  recommendedCrops: string;
  location: string;
  unknown: string;
  month: string;
  listen: string;
}

export interface AppState {
  language: Language;
  blynkToken: string;
  n8nWebhook: string;
  sensorData: SensorData;
  isAnalyzing: boolean;
  analysisResult: string | null;
}
