import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Define API_BASE_URL diretamente, como em outros serviços
const API_BASE_URL = ((import.meta as any).env?.VITE_CHAT_API_URL as string | undefined) || 'https://zenith.enrelyugi.com.br';
// Certifica-se de que a URL não termine com barra
const API_URL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

interface FavoriteItem {
  _id: string;
  title: string;
  price: number;
  image?: string;
  category?: string;
  seller?: {
    name: string;
    rating?: number;
  };
  addedAt: string;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
  clearFavorites: () => void;
  favoritesCount: number;
  isLoading: boolean;
  error: string | null;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Função de notificação segura que não depende do NotificationContext
  const showFeedback = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Exibir notificação usando console como fallback
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    
    // Se estivermos em um browser, podemos usar notificações nativas
    if (typeof window !== 'undefined') {
      try {
        // Tentar encontrar algum sistema de notificação global
        const notificationSystem = (window as any).notificationSystem;
        if (notificationSystem && typeof notificationSystem.addNotification === 'function') {
          notificationSystem.addNotification({
            title, message, type
          });
        }
      } catch (e) {
        // Silenciosamente ignora erros de notificação
      }
    }
  };
  
  // Configuração do axios com o token
  const getAxiosConfig = () => {
    return {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    };
  };
  
  // Função para sincronizar favoritos com o localStorage
  const syncToLocalStorage = (favs: FavoriteItem[]) => {
    try {
      localStorage.setItem('hacklote_favorites', JSON.stringify(favs));
    } catch (error) {
      console.error('Erro ao salvar favoritos no localStorage:', error);
    }
  };

  // Carrega favoritos do backend ao iniciar ou quando o usuário fizer login
  useEffect(() => {
    const fetchFavorites = async () => {
      const token = localStorage.getItem('token');
      // Se não estiver logado, carrega do localStorage
      if (!user || !token) {
        try {
          const stored = localStorage.getItem('hacklote_favorites');
          if (stored) {
            const parsed = JSON.parse(stored);
            setFavorites(parsed);
          }
        } catch (error) {
          console.error('Erro ao carregar favoritos do localStorage:', error);
        }
        return;
      }

      // Se estiver logado, carrega do backend
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`${API_URL}/api/favorites`, getAxiosConfig());
        if (response.data.success) {
          // Transforma os favoritos da API para o formato esperado pelo frontend
          const apiFavorites = response.data.data.favorites.map((fav: any) => ({
            _id: fav.itemId,
            title: fav.title,
            price: fav.price,
            image: fav.image || '',
            category: fav.category || '',
            addedAt: new Date(fav.addedAt).toISOString()
          }));
          
          setFavorites(apiFavorites);
          // Backup no localStorage
          syncToLocalStorage(apiFavorites);
        }
      } catch (error) {
        console.error('Erro ao buscar favoritos da API:', error);
        setError('Não foi possível carregar seus favoritos. Carregando da versão local.');
        
        // Fallback para localStorage
        try {
          const stored = localStorage.getItem('hacklote_favorites');
          if (stored) {
            const parsed = JSON.parse(stored);
            setFavorites(parsed);
          }
        } catch (localError) {
          console.error('Erro ao carregar favoritos do localStorage:', localError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  // Adiciona um item aos favoritos
  const addFavorite = async (item: FavoriteItem) => {
    // Verifica se já existe
    if (favorites.some((fav) => fav._id === item._id)) {
      return;
    }

    // Cria o novo item
    const newItem = { ...item, addedAt: new Date().toISOString() };
    
    // Atualiza o estado localmente primeiro para UI responsiva
    setFavorites(prev => [...prev, newItem]);
    
    // Sincroniza com localStorage
    syncToLocalStorage([...favorites, newItem]);

    // Se estiver logado, salva no backend
    const token = localStorage.getItem('token');
    if (user && token) {
      try {
        await axios.post(`${API_URL}/api/favorites`, {
          itemId: item._id,
          title: item.title,
          price: item.price,
          image: item.image || '',
          category: item.category || ''
        }, getAxiosConfig());
      } catch (error) {
        console.error('Erro ao salvar favorito na API:', error);
        showFeedback(
          'Erro ao salvar favorito',
          'Não foi possível salvar o item no servidor, mas ele foi salvo localmente.',
          'warning'
        );
      }
    }
  };

  // Remove um item dos favoritos
  const removeFavorite = async (itemId: string) => {
    // Atualiza o estado localmente primeiro
    setFavorites(prev => prev.filter(fav => fav._id !== itemId));
    
    // Sincroniza com localStorage
    const updatedFavorites = favorites.filter(fav => fav._id !== itemId);
    syncToLocalStorage(updatedFavorites);

    // Se estiver logado, remove do backend
    const token = localStorage.getItem('token');
    if (user && token) {
      try {
        await axios.delete(`${API_URL}/api/favorites/${itemId}`, getAxiosConfig());
      } catch (error) {
        console.error('Erro ao remover favorito da API:', error);
      }
    }
  };

  // Verifica se um item é favorito
  const isFavorite = (itemId: string): boolean => {
    return favorites.some((fav) => fav._id === itemId);
  };

  // Limpa todos os favoritos
  const clearFavorites = async () => {
    // Limpa localmente
    setFavorites([]);
    syncToLocalStorage([]);
    
    // Se estiver logado, limpa no backend
    const token = localStorage.getItem('token');
    if (user && token) {
      try {
        await axios.delete(`${API_URL}/api/favorites`, getAxiosConfig());
      } catch (error) {
        console.error('Erro ao limpar favoritos na API:', error);
      }
    }
  };

  const value: FavoritesContextType = {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearFavorites,
    favoritesCount: favorites.length,
    isLoading,
    error
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
