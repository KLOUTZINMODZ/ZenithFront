import { useState, useEffect } from 'react';


export const useIsMobileDevice = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      
      const screenWidth = window.innerWidth;
      const isMobileWidth = screenWidth <= 768;

      
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);

      
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      
      const hasOrientation = typeof window.orientation !== 'undefined';

      
      const mobileMediaQuery = window.matchMedia('(max-width: 768px)').matches;

      
      const isMobileDevice = (
        (isMobileWidth && (isMobileUA || hasTouch)) || 
        (isMobileUA && isMobileWidth) || 
        (hasOrientation && isMobileWidth) || 
        (mobileMediaQuery && hasTouch) 
      );

      setIsMobile(isMobileDevice);

      
      console.log('Mobile Detection:', {
        screenWidth,
        isMobileWidth,
        isMobileUA,
        hasTouch,
        hasOrientation,
        mobileMediaQuery,
        finalDecision: isMobileDevice
      });
    };

    
    checkIsMobile();

    
    const handleResize = () => {
      checkIsMobile();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return isMobile;
};


export const checkIsMobileDevice = (): boolean => {
  const screenWidth = window.innerWidth;
  const isMobileWidth = screenWidth <= 768;
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return (isMobileWidth && (isMobileUA || hasTouch)) || (isMobileUA && isMobileWidth);
};
