import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://zenith.enrelyugi.com.br/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    
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
      
      return Promise.reject(error);
    }

    
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    
    return Promise.reject(error);
  }
);

export default api;