
import { useCallback, useRef, useState } from 'react';
import { useWebSocketListener } from './useWebSocketListener';
import { WalletBalanceUpdatedEvent } from '../types/websocket.types';
import { debounce } from '../utils/performance.utils';


interface WalletBalance {
  balance: number;
  escrowBalance?: number;
  lastUpdated: string;
}

interface UseWalletEventsOptions {
  userId?: string;
  onBalanceUpdated?: (balance: WalletBalance) => void;
  debug?: boolean;
  debounceTime?: number;
}

interface WalletEventHandlers {
  handleBalanceUpdate: (balance: number, escrowBalance?: number) => void;
  handleEscrowUpdate: (escrowBalance: number, balance?: number) => void;
}

export const useWalletEvents = (
  options: UseWalletEventsOptions = {}
): WalletEventHandlers => {
  const {
    userId,
    onBalanceUpdated,
    debug = false,
    debounceTime = 100
  } = options;

  const onBalanceUpdatedRef = useRef(onBalanceUpdated);
  const userIdRef = useRef(userId);
  useCallback(() => {
    onBalanceUpdatedRef.current = onBalanceUpdated;
    userIdRef.current = userId;
  }, [onBalanceUpdated, userId])();

  const handleBalanceUpdate = useCallback(
    debounce((balance: number, escrowBalance?: number) => {

      if (onBalanceUpdatedRef.current) {
        onBalanceUpdatedRef.current({
          balance,
          escrowBalance,
          lastUpdated: new Date().toISOString()
        });
      }
    }, debounceTime),
    [debug, debounceTime]
  );

  const handleEscrowUpdate = useCallback(
    (escrowBalance: number, balance?: number) => {

      if (onBalanceUpdatedRef.current) {
        onBalanceUpdatedRef.current({
          balance: typeof balance === 'number' ? balance : undefined,
          escrowBalance,
          lastUpdated: new Date().toISOString()
        });
      }
    },
    [debug]
  );

  useWebSocketListener<WalletBalanceUpdatedEvent>(
    'wallet:balance_updated',
    (event) => {
      const { data } = event;

      // Filtrar por userId se especificado
      if (userIdRef.current && data.userId !== userIdRef.current) {
        if (debug) {
          console.log('[useWalletEvents] Evento ignorado (userId diferente):', {
            expected: userIdRef.current,
            received: data.userId
          });
        }
        return;
      }

      if (typeof data.balance !== 'number') {
        return;
      }

      handleBalanceUpdate(data.balance, data.escrowBalance);
    },
    {
      validateData: true,
      debug,
      onError: (error) => {}
    }
  );

  useWebSocketListener<WalletBalanceUpdatedEvent>(
    'wallet:escrow_updated',
    (event) => {
      const { data } = event;

      // Filtrar por userId se especificado
      if (userIdRef.current && data.userId !== userIdRef.current) {
        if (debug) {
          console.log('[useWalletEvents] Evento ignorado (userId diferente):', {
            expected: userIdRef.current,
            received: data.userId
          });
        }
        return;
      }

      if (typeof data.escrowBalance !== 'number') {
        return;
      }

      handleEscrowUpdate(data.escrowBalance, data.balance);
    },
    {
      validateData: true,
      debug,
      onError: (error) => {}
    }
  );


  return {
    handleBalanceUpdate,
    handleEscrowUpdate
  };
};

export const useWalletState = (
  userId: string,
  options: {
    initialBalance?: number;
    initialEscrowBalance?: number;
    debug?: boolean;
  } = {}
) => {
  const {
    initialBalance = 0,
    initialEscrowBalance = 0,
    debug = false
  } = options;

  const [balance, setBalance] = useState<number>(initialBalance);
  const [escrowBalance, setEscrowBalance] = useState<number>(initialEscrowBalance);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useWalletEvents({
    userId,
    debug,
    onBalanceUpdated: useCallback((walletBalance: WalletBalance) => {
      setBalance(walletBalance.balance);
      
      if (walletBalance.escrowBalance !== undefined) {
        setEscrowBalance(walletBalance.escrowBalance);
      }
      
      setLastUpdated(walletBalance.lastUpdated);
      setIsLoading(false);
    }, [])
  });

  const updateBalance = useCallback((newBalance: number, newEscrowBalance?: number) => {
    setBalance(newBalance);
    
    if (newEscrowBalance !== undefined) {
      setEscrowBalance(newEscrowBalance);
    }
    
    setLastUpdated(new Date().toISOString());
  }, []);

  const availableBalance = balance - escrowBalance;

  const formatBalance = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  return {
    balance,
    escrowBalance,
    availableBalance,
    lastUpdated,
    isLoading,
    setBalance,
    setEscrowBalance,
    updateBalance,
    formatBalance,
    hasBalance: balance > 0,
    hasEscrow: escrowBalance > 0,
    canSpend: (amount: number) => availableBalance >= amount
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default useWalletEvents;
