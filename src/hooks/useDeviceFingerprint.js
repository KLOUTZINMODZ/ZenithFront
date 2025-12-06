import { useState, useEffect, useCallback } from 'react';
import { generateDeviceFingerprint } from '../utils/deviceFingerprint';


export const useDeviceFingerprint = () => {
  const [fingerprint, setFingerprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fingerprintData, setFingerprintData] = useState(null);

  


  const generateFingerprint = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await generateDeviceFingerprint();
      
      setFingerprint(result.fingerprint);
      setFingerprintData(result);
      

      localStorage.setItem('device_fingerprint', JSON.stringify({
        fingerprint: result.fingerprint,
        timestamp: result.timestamp,
        components: result.components
      }));
      
            return result;
      
    } catch (err) {
            setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  


  const loadFingerprint = useCallback(async () => {
    try {

      const savedFingerprint = localStorage.getItem('device_fingerprint');
      
      if (savedFingerprint) {
        const parsed = JSON.parse(savedFingerprint);
        const savedTime = new Date(parsed.timestamp);
        const now = new Date();
        

        if ((now - savedTime) < 24 * 60 * 60 * 1000) {
          setFingerprint(parsed.fingerprint);
          setFingerprintData(parsed);
          setIsLoading(false);
                    return parsed;
        }
      }
      

      return await generateFingerprint();
      
    } catch (err) {
            return await generateFingerprint();
    }
  }, [generateFingerprint]);

  


  const addFingerprintToHeaders = useCallback((headers = {}) => {
    if (fingerprint) {
      return {
        ...headers,
        'X-Device-Fingerprint': fingerprint,
        'X-Browser-Fingerprint': fingerprintData?.components?.canvas || 'unknown'
      };
    }
    return headers;
  }, [fingerprint, fingerprintData]);

  


  const createAxiosConfig = useCallback((config = {}) => {
    return {
      ...config,
      headers: addFingerprintToHeaders(config.headers)
    };
  }, [addFingerprintToHeaders]);

  


  const refreshFingerprint = useCallback(async () => {
    localStorage.removeItem('device_fingerprint');
    return await generateFingerprint();
  }, [generateFingerprint]);

  


  const needsUpdate = useCallback(() => {
    if (!fingerprintData) return true;
    
    const savedTime = new Date(fingerprintData.timestamp);
    const now = new Date();
    

    return (now - savedTime) > 24 * 60 * 60 * 1000;
  }, [fingerprintData]);


  useEffect(() => {
    loadFingerprint();
  }, [loadFingerprint]);


  useEffect(() => {
    if (!isLoading && needsUpdate()) {
            generateFingerprint();
    }
  }, [isLoading, needsUpdate, generateFingerprint]);

  return {

    fingerprint,
    fingerprintData,
    isLoading,
    error,
    

    generateFingerprint,
    refreshFingerprint,
    loadFingerprint,
    

    addFingerprintToHeaders,
    createAxiosConfig,
    needsUpdate,
    

    isReady: !isLoading && !!fingerprint,
    hasError: !!error,
    

    deviceInfo: fingerprintData?.components ? {
      userAgent: fingerprintData.components.userAgent,
      platform: fingerprintData.components.platform,
      language: fingerprintData.components.language,
      screenResolution: fingerprintData.components.screenResolution,
      timezone: fingerprintData.components.timezone
    } : null
  };
};


export const useSimpleFingerprint = () => {
  const { fingerprint, isLoading, error } = useDeviceFingerprint();
  
  return {
    fingerprint,
    isLoading,
    error,
    isReady: !isLoading && !!fingerprint
  };
};


import { createContext, useContext } from 'react';

const FingerprintContext = createContext();

export const FingerprintProvider = ({ children }) => {
  const fingerprintData = useDeviceFingerprint();
  
  return (
    <FingerprintContext.Provider value={fingerprintData}>
      {children}
    </FingerprintContext.Provider>
  );
};

export const useFingerprintContext = () => {
  const context = useContext(FingerprintContext);
  if (!context) {
    throw new Error('useFingerprintContext deve ser usado dentro de FingerprintProvider');
  }
  return context;
};

export default useDeviceFingerprint;
