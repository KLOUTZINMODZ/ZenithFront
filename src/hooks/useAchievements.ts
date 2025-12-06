import { useMemo } from 'react';
import { ACHIEVEMENTS, Achievement } from '../config/achievements';

interface UserStats {
  salesCount: number;
  purchasesCount: number;
  rating: number;
  balance: number;
  joinDate: string;
}

interface UnlockedAchievement extends Achievement {
  unlocked: boolean;
  progress?: number; 
}

export const useAchievements = (stats: UserStats): UnlockedAchievement[] => {
  return useMemo(() => {
    const now = new Date();
    const joinDate = new Date(stats.joinDate);
    const daysSinceJoin = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

    return ACHIEVEMENTS.map(achievement => {
      let unlocked = false;
      let progress = 0;

      switch (achievement.requirement.type) {
        case 'sales':
          unlocked = stats.salesCount >= achievement.requirement.value;
          progress = Math.min(100, (stats.salesCount / achievement.requirement.value) * 100);
          break;

        case 'purchases':
          unlocked = stats.purchasesCount >= achievement.requirement.value;
          progress = Math.min(100, (stats.purchasesCount / achievement.requirement.value) * 100);
          break;

        case 'rating':
          unlocked = stats.rating >= achievement.requirement.value;
          progress = Math.min(100, (stats.rating / achievement.requirement.value) * 100);
          break;

        case 'balance':
          unlocked = stats.balance >= achievement.requirement.value;
          progress = Math.min(100, (stats.balance / achievement.requirement.value) * 100);
          break;

        case 'combined':
          
          const condition = achievement.requirement.condition;
          
          if (condition === 'joinDate_7days') {
            unlocked = daysSinceJoin >= 7;
            progress = Math.min(100, (daysSinceJoin / 7) * 100);
          } 
          else if (condition === 'sales_5_purchases_5') {
            unlocked = stats.salesCount >= 5 && stats.purchasesCount >= 5;
            const salesProgress = (stats.salesCount / 5) * 50;
            const purchasesProgress = (stats.purchasesCount / 5) * 50;
            progress = Math.min(100, salesProgress + purchasesProgress);
          }
          else if (condition === 'sales_10_purchases_10') {
            unlocked = stats.salesCount >= 10 && stats.purchasesCount >= 10;
            const salesProgress = (stats.salesCount / 10) * 50;
            const purchasesProgress = (stats.purchasesCount / 10) * 50;
            progress = Math.min(100, salesProgress + purchasesProgress);
          }
          else if (condition === 'perfect_rating_10_transactions') {
            const totalTransactions = stats.salesCount + stats.purchasesCount;
            unlocked = stats.rating >= 5.0 && totalTransactions >= 10;
            const ratingProgress = (stats.rating / 5.0) * 50;
            const transactionProgress = (totalTransactions / 10) * 50;
            progress = Math.min(100, ratingProgress + transactionProgress);
          }
          break;
      }

      return {
        ...achievement,
        unlocked,
        progress: Math.round(progress)
      };
    });
  }, [stats]);
};


export const useAchievementsByCategory = (stats: UserStats) => {
  const achievements = useAchievements(stats);

  return useMemo(() => {
    return {
      vendas: achievements.filter(a => a.category === 'vendas'),
      compras: achievements.filter(a => a.category === 'compras'),
      avaliacao: achievements.filter(a => a.category === 'avaliacao'),
      financeiro: achievements.filter(a => a.category === 'financeiro'),
      social: achievements.filter(a => a.category === 'social'),
      especial: achievements.filter(a => a.category === 'especial'),
      all: achievements
    };
  }, [achievements]);
};


export const useAchievementStats = (stats: UserStats) => {
  const achievements = useAchievements(stats);

  return useMemo(() => {
    const unlocked = achievements.filter(a => a.unlocked);
    const total = achievements.length;
    const percentage = Math.round((unlocked.length / total) * 100);

    const byRarity = {
      comum: unlocked.filter(a => a.rarity === 'comum').length,
      raro: unlocked.filter(a => a.rarity === 'raro').length,
      epico: unlocked.filter(a => a.rarity === 'epico').length,
      lendario: unlocked.filter(a => a.rarity === 'lendario').length
    };

    return {
      unlocked: unlocked.length,
      total,
      percentage,
      byRarity,
      nextToUnlock: achievements
        .filter(a => !a.unlocked)
        .sort((a, b) => b.progress! - a.progress!)
        .slice(0, 3)
    };
  }, [achievements]);
};
