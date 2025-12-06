import { useState, useEffect, useCallback, useRef } from 'react';
import { highlightService } from '../services/highlightService';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface MarketplaceHighlight {
  _id: string;
  title: string;
  price: number;
  image: string;
  category: string;
  description: string;
  detached: boolean;
  highlightExpires: string | null;
  views: number;
  status: string;
  createdAt: string;
  timeRemaining?: {
    days: number;
    hours: number;
    minutes: number;
    isExpired: boolean;
    formattedString: string;
  } | null;
  isHighlighted: boolean;
}

interface UseMarketplaceHighlightsOptions {
  status?: 'all' | 'active' | 'expired';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useMarketplaceHighlights = (options: UseMarketplaceHighlightsOptions = {}) => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const {
    status = 'all',
    autoRefresh = true,
    refreshInterval = 30000
  } = options;

  const [highlights, setHighlights] = useState<MarketplaceHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date>(new Date());

  const fetchHighlights = useCallback(async (page: number = 1, showLoading: boolean = true) => {
    if (!user) return;

    if (showLoading) setLoading(true);
    setError(null);

    try {
      const response = await highlightService.getMyMarketplaceHighlights({
        status,
        page,
        limit: pagination.limit
      });

      if (response.success && response.data) {
        const newHighlights = response.data.highlights;
        

        const hasChanges = JSON.stringify(newHighlights) !== JSON.stringify(highlights);
        
        if (hasChanges) {

          const previouslyPending = highlights.filter((h: MarketplaceHighlight) => !h.isHighlighted);
          const nowActive = newHighlights.filter((h: MarketplaceHighlight) => h.isHighlighted);
          
          const newlyConfirmed = nowActive.filter((active: MarketplaceHighlight) => 
            previouslyPending.some((pending: MarketplaceHighlight) => pending._id === active._id)
          );


          const previouslyActive = highlights.filter((h: MarketplaceHighlight) => h.isHighlighted);
          const nowExpired = newHighlights.filter((h: MarketplaceHighlight) => !h.isHighlighted && h.highlightExpires);
          
          const recentlyExpired = nowExpired.filter((expired: MarketplaceHighlight) =>
            previouslyActive.some((active: MarketplaceHighlight) => active._id === expired._id)
          );


          if (newlyConfirmed.length > 0 && !showLoading) {
            addNotification({
              title: 'Destaque Confirmado!',
              message: `${newlyConfirmed.length} item(ns) foram destacados com sucesso`,
              type: 'success'
            });
          }

          if (recentlyExpired.length > 0 && !showLoading) {
            addNotification({
              title: 'Destaque Expirado',
              message: `${recentlyExpired.length} destaque(s) expiraram`,
              type: 'info'
            });
          }

          setHighlights(newHighlights);
          lastUpdateRef.current = new Date();
        }

        setPagination({
          total: response.data.pagination.total,
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          pages: response.data.pagination.pages
        });
      } else {
        setError(response.message || 'Erro ao carregar destaques');
      }
    } catch (err: any) {
      setError('Erro de conexão com o servidor');
          } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, status, pagination.limit, highlights, addNotification]);

  const refreshHighlights = useCallback(async () => {
    await fetchHighlights(pagination.page, false);
  }, [fetchHighlights, pagination.page]);


  useEffect(() => {
    if (autoRefresh && user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        refreshHighlights();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refreshHighlights, user]);


  useEffect(() => {
    if (user) {
      fetchHighlights(1, true);
    }
  }, [user, status]);


  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const changePage = useCallback(async (newPage: number) => {
    await fetchHighlights(newPage, true);
  }, [fetchHighlights]);

  const changeStatus = useCallback(async (_newStatus: 'all' | 'active' | 'expired') => {
    await fetchHighlights(1, true);
  }, [fetchHighlights]);

  return {
    highlights,
    loading,
    error,
    pagination,
    refreshHighlights,
    changePage,
    changeStatus,
    lastUpdate: lastUpdateRef.current
  };
};

export default useMarketplaceHighlights;
