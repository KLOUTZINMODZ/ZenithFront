import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';


interface ProposalState {
  acceptingProposal: string | null;
  acceptedProposals: Set<string>;
  errors: Map<string, string>;
  retryAttempts: Map<string, number>;
}

interface ProposalContextType {

  acceptingProposal: string | null;
  acceptedProposals: Set<string>;
  errors: Map<string, string>;
  retryAttempts: Map<string, number>;
  

  acceptProposal: (proposalId: string, acceptFn: () => Promise<void>) => Promise<void>;
  retryProposalAcceptance: (proposalId: string, acceptFn: () => Promise<void>) => Promise<void>;
  isProposalAccepted: (proposalId: string) => boolean;
  isProposalAccepting: (proposalId: string) => boolean;
  getProposalError: (proposalId: string) => string | undefined;
  getRetryAttempts: (proposalId: string) => number;
  canRetry: (proposalId: string) => boolean;
  clearProposalError: (proposalId: string) => void;
  markProposalAsAccepted: (proposalId: string) => void;
}


const ProposalContext = createContext<ProposalContextType | undefined>(undefined);


interface ProposalProviderProps {
  children: ReactNode;
}

export const ProposalProvider: React.FC<ProposalProviderProps> = ({ children }) => {
  const [state, setState] = useState<ProposalState>({
    acceptingProposal: null,
    acceptedProposals: new Set<string>(),
    errors: new Map<string, string>(),
    retryAttempts: new Map<string, number>()
  });


  


  const acceptProposal = useCallback(async (
    proposalId: string, 
    acceptFunction: () => Promise<void>
  ): Promise<void> => {

    if (state.acceptingProposal || state.acceptedProposals.has(proposalId)) {
            return;
    }


    setState(prev => ({
      ...prev,
      acceptingProposal: proposalId,
      errors: new Map(prev.errors).set(proposalId, '')
    }));

    try {
            

      await acceptFunction();
      

      setState(prev => {
        const newAccepted = new Set(prev.acceptedProposals);
        newAccepted.add(proposalId);
        
        const newErrors = new Map(prev.errors);
        newErrors.delete(proposalId);
        
        return {
          ...prev,
          acceptingProposal: null,
          acceptedProposals: newAccepted,
          errors: newErrors
        };
      });
      
            

      window.dispatchEvent(new CustomEvent('proposal:accepted', {
        detail: { proposalId }
      }));
      
    } catch (error) {
            

      setState(prev => {
        const newErrors = new Map(prev.errors);
        newErrors.set(proposalId, error instanceof Error ? error.message : 'Erro desconhecido');
        
        const newRetryAttempts = new Map(prev.retryAttempts);
        const currentAttempts = newRetryAttempts.get(proposalId) || 0;
        newRetryAttempts.set(proposalId, currentAttempts + 1);
        
        return {
          ...prev,
          acceptingProposal: null,
          errors: newErrors,
          retryAttempts: newRetryAttempts
        };
      });
      

      throw error;
    }
  }, [state.acceptingProposal, state.acceptedProposals]);

  


  const retryProposalAcceptance = useCallback(async (proposalId: string, acceptFn: () => Promise<void>): Promise<void> => {

    setState(prev => {
      const newErrors = new Map(prev.errors);
      newErrors.delete(proposalId);
      return {
        ...prev,
        errors: newErrors
      };
    });
    

    return acceptProposal(proposalId, acceptFn);
  }, [acceptProposal]);

  


  const isProposalAccepted = useCallback((proposalId: string): boolean => {
    return state.acceptedProposals.has(proposalId);
  }, [state.acceptedProposals]);

  


  const isProposalAccepting = useCallback((proposalId: string): boolean => {
    return state.acceptingProposal === proposalId;
  }, [state.acceptingProposal]);

  


  const getProposalError = useCallback((proposalId: string): string | undefined => {
    return state.errors.get(proposalId);
  }, [state.errors]);

  


  const getRetryAttempts = useCallback((proposalId: string): number => {
    return state.retryAttempts.get(proposalId) || 0;
  }, [state.retryAttempts]);

  


  const canRetry = useCallback((proposalId: string): boolean => {
    const attempts = state.retryAttempts.get(proposalId) || 0;
    return attempts < 3;
  }, [state.retryAttempts]);

  


  const clearProposalError = useCallback((proposalId: string): void => {
    setState(prev => {
      const newErrors = new Map(prev.errors);
      newErrors.delete(proposalId);
      const newRetryAttempts = new Map(prev.retryAttempts);
      newRetryAttempts.delete(proposalId);
      return {
        ...prev,
        errors: newErrors,
        retryAttempts: newRetryAttempts
      };
    });
  }, []);

  


  const markProposalAsAccepted = useCallback((proposalId: string): void => {
    setState(prev => {
      const newAccepted = new Set(prev.acceptedProposals);
      newAccepted.add(proposalId);
      return {
        ...prev,
        acceptedProposals: newAccepted
      };
    });
  }, []);


  const contextValue: ProposalContextType = {

    acceptingProposal: state.acceptingProposal,
    acceptedProposals: state.acceptedProposals,
    errors: state.errors,
    retryAttempts: state.retryAttempts,
    

    acceptProposal,
    retryProposalAcceptance,
    isProposalAccepted,
    isProposalAccepting,
    getProposalError,
    getRetryAttempts,
    canRetry,
    clearProposalError,
    markProposalAsAccepted
  };

  return (
    <ProposalContext.Provider value={contextValue}>
      {children}
    </ProposalContext.Provider>
  );
};


export const useProposal = (): ProposalContextType => {
  const context = useContext(ProposalContext);
  if (context === undefined) {
    throw new Error('useProposal deve ser usado dentro de um ProposalProvider');
  }
  return context;
};

export default ProposalContext;
