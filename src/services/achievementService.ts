import axios from 'axios';

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:5000';


const chatApi = axios.create({
  baseURL: CHAT_API_URL
});


chatApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AchievementStats {
  totalSales: number;
  totalPurchases: number;
  totalTransactions: number;
  averageRating: number;
  ratingCount: number;
  highestBalance: number;
  lastUpdated: string;
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: string;
  notified: boolean;
}

export interface UserAchievements {
  unlocked: UnlockedAchievement[];
  stats: AchievementStats;
}


export const getUserAchievements = async (): Promise<UserAchievements> => {
  try {
    const response = await chatApi.get('/api/achievements');
    return response.data.data;
  } catch (error: any) {
        throw error;
  }
};


export const getUserAchievementsById = async (userId: string): Promise<UserAchievements> => {
  try {
    const response = await chatApi.get(`/api/achievements/user/${userId}`);
    return response.data.data;
  } catch (error: any) {
        throw error;
  }
};


export const updateAchievementStats = async (stats: {
  totalSales?: number;
  totalPurchases?: number;
  averageRating?: number;
  ratingCount?: number;
  currentBalance?: number;
}): Promise<{
  newAchievements: string[];
  totalUnlocked: number;
  stats: AchievementStats;
}> => {
  try {
    const response = await chatApi.post('/api/achievements/update-stats', stats);
    return response.data.data;
  } catch (error: any) {
        throw error;
  }
};


export const forceCheckAchievements = async (): Promise<{
  newAchievements: string[];
  totalUnlocked: number;
}> => {
  try {
    const response = await chatApi.post('/api/achievements/check');
    return response.data.data;
  } catch (error: any) {
        throw error;
  }
};


export const getUnnotifiedAchievements = async (): Promise<UnlockedAchievement[]> => {
  try {
    const response = await chatApi.get('/api/achievements/unnotified');
    return response.data.data;
  } catch (error: any) {
        throw error;
  }
};


export const markAchievementAsNotified = async (achievementId: string): Promise<void> => {
  try {
    await chatApi.put(`/api/achievements/${achievementId}/notified`);
  } catch (error: any) {
        throw error;
  }
};


export const syncUserStats = async (
  salesCount: number,
  purchasesCount: number,
  rating: number,
  balance: number
): Promise<string[]> => {
  try {
    const result = await updateAchievementStats({
      totalSales: salesCount,
      totalPurchases: purchasesCount,
      averageRating: rating,
      currentBalance: balance
    });
    
    return result.newAchievements;
  } catch (error) {
        return [];
  }
};

const achievementService = {
  getUserAchievements,
  getUserAchievementsById,
  updateAchievementStats,
  forceCheckAchievements,
  getUnnotifiedAchievements,
  markAchievementAsNotified,
  syncUserStats
};

export default achievementService;
