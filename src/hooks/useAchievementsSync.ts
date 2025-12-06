import { useState, useEffect, useCallback } from 'react';
import achievementService, { UserAchievements } from '../services/achievementService';


export const useAchievementsSync = (
  salesCount: number,
  purchasesCount: number,
  rating: number,
  balance: number
) => {
  const [backendAchievements, setBackendAchievements] = useState<UserAchievements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);

  
  const fetchAchievements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await achievementService.getUserAchievements();
      setBackendAchievements(data);
    } catch (err: any) {
            setError(err.message || 'Erro ao buscar conquistas');
      
      setBackendAchievements({
        unlocked: [],
        stats: {
          totalSales: 0,
          totalPurchases: 0,
          totalTransactions: 0,
          averageRating: 0,
          ratingCount: 0,
          highestBalance: 0,
          lastUpdated: new Date().toISOString()
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  
  const syncStats = useCallback(async () => {
    try {
      const result = await achievementService.syncUserStats(
        salesCount,
        purchasesCount,
        rating,
        balance
      );

      
      if (result && result.length > 0) {
        setNewAchievements(result);
        
        await fetchAchievements();
      }

      return result;
    } catch (err) {
            return [];
    }
  }, [salesCount, purchasesCount, rating, balance, fetchAchievements]);

  
  const forceCheck = useCallback(async () => {
    try {
      const result = await achievementService.forceCheckAchievements();
      
      if (result.newAchievements && result.newAchievements.length > 0) {
        setNewAchievements(result.newAchievements);
        await fetchAchievements();
      }

      return result;
    } catch (err) {
            return { newAchievements: [], totalUnlocked: 0 };
    }
  }, [fetchAchievements]);

  
  const markAsNotified = useCallback(async (achievementId: string) => {
    try {
      await achievementService.markAchievementAsNotified(achievementId);
      
      setNewAchievements(prev => prev.filter(id => id !== achievementId));
    } catch (err) {
          }
  }, []);

  
  const fetchUnnotified = useCallback(async () => {
    try {
      const unnotified = await achievementService.getUnnotifiedAchievements();
      setNewAchievements(unnotified.map(a => a.achievementId));
      return unnotified;
    } catch (err) {
            return [];
    }
  }, []);

  
  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  
  useEffect(() => {
    if (!isLoading && backendAchievements) {
      const timer = setTimeout(() => {
        syncStats();
      }, 1000); 

      return () => clearTimeout(timer);
    }
  }, [salesCount, purchasesCount, rating, balance, isLoading, backendAchievements, syncStats]);

  return {
    
    backendAchievements,
    newAchievements,
    isLoading,
    error,

    
    syncStats,
    forceCheck,
    markAsNotified,
    fetchUnnotified,
    refresh: fetchAchievements
  };
};

export default useAchievementsSync;
