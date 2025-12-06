import axios from 'axios';


const CHAT_API_BASE = (import.meta as any).env?.VITE_CHAT_API_URL || 'http://localhost:5000';
let resolvedBase = CHAT_API_BASE;
try {
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && resolvedBase.startsWith('http://')) {
    resolvedBase = resolvedBase.replace('http://', 'https://');
  }
} catch {}

const chatApi = axios.create({
  baseURL: resolvedBase.replace(/\/$/, ''),
});

try {  } catch {}

chatApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  config.headers = config.headers || {};
  (config.headers as any)['ngrok-skip-browser-warning'] = '1';
  return config;
});

chatApi.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
            
      
      const responseData = error?.response?.data;
      if (responseData?.banned || responseData?.forceLogout || 
          (error?.response?.status === 403 && responseData?.error === 'Account banned')) {
        
                                        
        
        localStorage.clear();
        
        
        window.dispatchEvent(new CustomEvent('user-banned', { 
          detail: {
            reason: responseData?.bannedReason || 'Violação dos termos de uso',
            bannedAt: responseData?.bannedAt,
            bannedUntil: responseData?.bannedUntil,
            isPermanent: responseData?.isPermanent
          }
        }));
        
        
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    } catch {}
    return Promise.reject(error);
  }
);

export default chatApi;
