import { useState, useEffect, useCallback } from 'react';
import { PaymentPersistenceService } from '../services/paymentPersistence';
import api from '../services/api';

interface PendingPayment {
  sessionId: string;
  externalReference: string;
  userId: string;
  itemIds: string[];
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  totalAmount: number;
  itemsCount: number;
}

export const usePendingPayments = (userId?: string) => {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [activePolling, setActivePolling] = useState<Set<string>>(new Set());


  const loadPendingPayments = useCallback(() => {
    if (!userId) return;
    
    const payments = PaymentPersistenceService.getUserPendingPayments(userId);
    
    if (payments.length > 0) {
      setPendingPayments(payments);
      

      payments.forEach(payment => {
        if (payment.status === 'pending') {
          startPollingPayment(payment.sessionId);
        }
      });
    }
  }, [userId]);


  const checkPaymentStatus = useCallback(async (sessionId: string): Promise<string | null> => {
    try {
      
      const response = await api.get(`/v1/marketplace-highlights-payment/status/${sessionId}`);
      
      if (response.data.success) {
        const status = response.data.data.status;
        

        PaymentPersistenceService.updatePaymentStatus(sessionId, status);
        
        return status;
      }
      
      return null;
    } catch (error: any) {
      


      return null;
    }
  }, []);


  const startPollingPayment = useCallback((sessionId: string) => {
    if (activePolling.has(sessionId)) {
      return;
    }

    setActivePolling(prev => new Set(prev).add(sessionId));

    const pollInterval = setInterval(async () => {
      const status = await checkPaymentStatus(sessionId);
      
      if (status === 'approved') {
        clearInterval(pollInterval);
        setActivePolling(prev => {
          const newSet = new Set(prev);
          newSet.delete(sessionId);
          return newSet;
        });
        

        setPendingPayments(prev => 
          prev.map(p => p.sessionId === sessionId 
            ? { ...p, status: 'approved' as const }
            : p
          )
        );
        

        
      } else if (status === 'rejected' || status === 'cancelled') {
        clearInterval(pollInterval);
        setActivePolling(prev => {
          const newSet = new Set(prev);
          newSet.delete(sessionId);
          return newSet;
        });
        

        setPendingPayments(prev => 
          prev.map(p => p.sessionId === sessionId 
            ? { ...p, status: status as 'rejected' | 'cancelled' }
            : p
          )
        );
      }
    }, 5000);


    setTimeout(() => {
      clearInterval(pollInterval);
      setActivePolling(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }, 30 * 60 * 1000);

  }, [checkPaymentStatus, activePolling]);


  const checkAllPendingPayments = useCallback(async () => {
    if (pendingPayments.length === 0) return;
    
    setIsChecking(true);
    
    for (const payment of pendingPayments) {
      if (payment.status === 'pending') {
        await checkPaymentStatus(payment.sessionId);

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsChecking(false);

    loadPendingPayments();
  }, [pendingPayments, checkPaymentStatus, loadPendingPayments]);


  const removePayment = useCallback((sessionId: string) => {
    PaymentPersistenceService.removePayment(sessionId);
    setPendingPayments(prev => prev.filter(p => p.sessionId !== sessionId));
    

    setActivePolling(prev => {
      const newSet = new Set(prev);
      newSet.delete(sessionId);
      return newSet;
    });
  }, []);


  useEffect(() => {
    loadPendingPayments();
  }, [loadPendingPayments]);


  useEffect(() => {
    if (pendingPayments.length > 0) {
      const timer = setTimeout(() => {
        checkAllPendingPayments();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [pendingPayments.length, checkAllPendingPayments]);

  return {
    pendingPayments,
    isChecking,
    activePolling: activePolling.size,
    checkAllPendingPayments,
    loadPendingPayments,
    removePayment,
    startPollingPayment
  };
};

export default usePendingPayments;
