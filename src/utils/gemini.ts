import axios from 'axios';
import { GEMINI_CONFIG, Logger } from '../config/gemini';

// Cliente HTTP optimizado para Gemini API
export const geminiClient = axios.create({
  baseURL: GEMINI_CONFIG.apiUrl,
  timeout: GEMINI_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'OnboardingDigital/1.0',
    'Accept': 'application/json'
  },
  params: {
    key: GEMINI_CONFIG.apiKey
  }
});

// Interceptor para logging de requests
geminiClient.interceptors.request.use(
  (config: any) => {
    Logger.debug('Enviando solicitud a Gemini API', {
      url: config.url,
      method: config.method,
      timestamp: new Date().toISOString()
    });
    return config;
  },
  (error: any) => {
    Logger.error('Error en request a Gemini API', { error: error.message });
    return Promise.reject(error);
  }
);

// Interceptor para logging de responses
geminiClient.interceptors.response.use(
  (response: any) => {
    Logger.debug('Respuesta recibida de Gemini API', {
      status: response.status,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  (error: any) => {
    Logger.error('Error en respuesta de Gemini API', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      timestamp: new Date().toISOString()
    });
    return Promise.reject(error);
  }
);
