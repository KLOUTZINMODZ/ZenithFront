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

export class PaymentPersistenceService {
  private static STORAGE_KEY = 'hacklote_pending_payments';
  private static MAX_AGE_HOURS = 24;

  


  static savePendingPayment(payment: PendingPayment): void {
    try {
      
      const pendingPayments = this.getPendingPayments();
      

      const filteredPayments = pendingPayments.filter(p => p.sessionId !== payment.sessionId);
      

      filteredPayments.push({
        ...payment,
        createdAt: new Date().toISOString()
      });
      

      const cleanedPayments = this.cleanExpiredPayments(filteredPayments);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedPayments));
      
    } catch (error) {
    }
  }

  


  static getPendingPayments(): PendingPayment[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const payments = JSON.parse(stored) as PendingPayment[];
      return this.cleanExpiredPayments(payments);
    } catch (error) {
      return [];
    }
  }

  


  static updatePaymentStatus(sessionId: string, status: PendingPayment['status']): void {
    try {
      const payments = this.getPendingPayments();
      const paymentIndex = payments.findIndex(p => p.sessionId === sessionId);
      
      if (paymentIndex !== -1) {
        payments[paymentIndex].status = status;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payments));
        
        

        if (status === 'approved') {
          setTimeout(() => {
            this.removePayment(sessionId);
          }, 5 * 60 * 1000);
        }
      }
    } catch (error) {
    }
  }

  


  static removePayment(sessionId: string): void {
    try {
      const payments = this.getPendingPayments();
      const filteredPayments = payments.filter(p => p.sessionId !== sessionId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredPayments));
      
    } catch (error) {
    }
  }

  


  static getUserPendingPayments(userId: string): PendingPayment[] {
    const allPayments = this.getPendingPayments();
    return allPayments.filter(p => p.userId === userId && p.status === 'pending');
  }

  


  private static cleanExpiredPayments(payments: PendingPayment[]): PendingPayment[] {
    const now = new Date();
    const maxAge = this.MAX_AGE_HOURS * 60 * 60 * 1000;
    
    return payments.filter(payment => {
      const createdAt = new Date(payment.createdAt);
      const age = now.getTime() - createdAt.getTime();
      

      if (age < maxAge) return true;
      

      if (payment.status === 'approved') return age < (maxAge * 2);
      
      return false;
    });
  }

  


  static getStorageStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    oldestDate: string | null;
  } {
    const payments = this.getPendingPayments();
    
    return {
      total: payments.length,
      pending: payments.filter(p => p.status === 'pending').length,
      approved: payments.filter(p => p.status === 'approved').length,
      rejected: payments.filter(p => p.status === 'rejected').length,
      oldestDate: payments.length > 0 
        ? payments.reduce((oldest, p) => 
            new Date(p.createdAt) < new Date(oldest) ? p.createdAt : oldest
          , payments[0].createdAt)
        : null
    };
  }

  


  static clearAllPayments(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export default PaymentPersistenceService;
