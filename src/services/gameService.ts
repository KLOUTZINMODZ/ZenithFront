import api from './api';

export interface Game {
  _id: string;
  name: string;
  slug: string;
}

interface GamesResponse {
  success: boolean;
  data?: {
    games: Game[];
    total?: number;
  } | Game[];
  message?: string;
  error?: string;
}

const gameService = {
  getAllGames: async (): Promise<{ success: boolean; data: Game[]; message?: string }> => {
    try {
      const response = await api.get<GamesResponse>('/games');
      const payload = response.data;
      if (!payload.success) return { success: false, data: [], message: payload.message };


      const games: Game[] = Array.isArray(payload.data)
        ? payload.data
        : (payload.data?.games ?? []);

      return { success: true, data: games };
    } catch (error: any) {
      if (error.response) {
        const payload = error.response.data as GamesResponse;
        return { success: false, data: [], message: payload.message };
      }
      return { success: false, data: [], message: 'Erro de conexão com o servidor' };
    }
  }
};

export default gameService;
