


import boostingChatService from './boostingChatService';
import pollingService from './pollingService';

export interface UserRole {
  role: 'client' | 'booster' | 'unknown';
  conversationId: string;
  userId: string;
  proposalData?: any;
}

class UserRoleDetectionService {
  private roleCache: Map<string, UserRole> = new Map();

  


  async detectUserRole(conversationId: string, userId: string): Promise<UserRole> {
    const cacheKey = `${conversationId}_${userId}`;
    
    
    const normalizedUserId = String(userId).trim();

    if (this.roleCache.has(cacheKey)) {
      return this.roleCache.get(cacheKey)!;
    }

    try {
      
      try {
        const directRole = await this.detectRoleFromConversation(conversationId, normalizedUserId);
        if (directRole.role !== 'unknown') {
                    this.roleCache.set(cacheKey, directRole);
          return directRole;
        }
      } catch (directError) {
              }

      
      const proposal = await boostingChatService.getAcceptedProposal(conversationId);
      
      let detectedRole: 'client' | 'booster' | 'unknown' = 'unknown';
      
      
      const clientUserId = this.normalizeId(proposal.client?.userid);
      const boosterUserId = this.normalizeId(proposal.booster?.userid);
      
                              
      if (clientUserId && clientUserId === normalizedUserId) {
        detectedRole = 'client';
      } else if (boosterUserId && boosterUserId === normalizedUserId) {
        detectedRole = 'booster';
      }

      
      const userRole: UserRole = {
        role: detectedRole,
        conversationId,
        userId: normalizedUserId,
        proposalData: proposal
      };

      this.roleCache.set(cacheKey, userRole);
      return userRole;
    } catch (error) {
      
      try {
        const fallbackRole = await this.detectRoleByFallback(conversationId, normalizedUserId);
        if (fallbackRole.role !== 'unknown') {
                    this.roleCache.set(cacheKey, fallbackRole);
          return fallbackRole;
        }
      } catch (fallbackError) {
              }
    }

    
        const fallbackRole: UserRole = {
      role: 'unknown',
      conversationId,
      userId: normalizedUserId
    };

    this.roleCache.set(cacheKey, fallbackRole);
    return fallbackRole;
  }

  


  private normalizeId(id: any): string | null {
    if (!id) return null;
    
    
        
    
    if (typeof id === 'string') {
      return id.trim();
    }
    
    
    if (typeof id === 'number') {
      return String(id);
    }
    
    
    if (typeof id === 'object') {
      
      if (id.$oid) {
        return String(id.$oid).trim();
      }
      
      
      if (id._id) {
        return this.normalizeId(id._id); 
      }
      
      
      if (id.userid) {
        return this.normalizeId(id.userid); 
      }
      
      
      if (id.id) {
        return this.normalizeId(id.id); 
      }
      
      
      const strValue = String(id);
      if (strValue && strValue !== '[object Object]') {
        return strValue.trim();
      }
      
            return null;
    }
    
    
    return String(id).trim();
  }

  


  private async detectRoleFromConversation(conversationId: string, userId: string): Promise<UserRole> {
    try {
      const conversations = await pollingService.getConversations();
      const conversation = conversations.find(conv => conv._id === conversationId);
      
      if (!conversation) {
        return { role: 'unknown', conversationId, userId };
      }
      
      const conv = conversation as any;
      
      
      if (conv.client && conv.booster) {
        const clientUserId = this.normalizeId(conv.client.userid);
        const boosterUserId = this.normalizeId(conv.booster.userid);
        
                                        
        if (clientUserId && clientUserId === userId) {
          return { role: 'client', conversationId, userId, proposalData: conversation };
        } else if (boosterUserId && boosterUserId === userId) {
          return { role: 'booster', conversationId, userId, proposalData: conversation };
        }
      }
      
      return { role: 'unknown', conversationId, userId };
    } catch (error) {
            return { role: 'unknown', conversationId, userId };
    }
  }

  


  private async detectRoleByFallback(conversationId: string, userId: string): Promise<UserRole> {
    try {
      const conversations = await pollingService.getConversations();
      const conversation = conversations.find(conv => conv._id === conversationId);
      
      if (conversation && conversation.participants) {
        
        if (conversation.participants.length === 2) {
          const userParticipant = conversation.participants.find(p => {
            const pId = this.normalizeId(p.user?._id || (p as any)._id);
            return pId === userId;
          });
          
          if (userParticipant) {
            const userIndex = conversation.participants.findIndex(p => {
              const pId = this.normalizeId(p.user?._id || (p as any)._id);
              return pId === userId;
            });
            
                        
            
            if (userIndex === 1) {
              return {
                role: 'booster',
                conversationId,
                userId,
                proposalData: null
              };
            } else if (userIndex === 0) {
              return {
                role: 'client',
                conversationId,
                userId,
                proposalData: null
              };
            }
          }
        }
      }
    } catch (error) {
          }
    
    
    return {
      role: 'unknown',
      conversationId,
      userId,
      proposalData: null
    };
  }

  


  getCachedUserRole(conversationId: string, userId: string): UserRole | null {
    const cacheKey = `${conversationId}_${userId}`;
    return this.roleCache.get(cacheKey) || null;
  }

  


  clearConversationCache(conversationId: string): void {
    const keysToDelete = Array.from(this.roleCache.keys())
      .filter(key => key.startsWith(conversationId));
    
    keysToDelete.forEach(key => this.roleCache.delete(key));
  }

  


  clearCache(): void {
    this.roleCache.clear();
  }

  


  async preloadUserRoles(conversations: Array<{_id: string}>, userId: string): Promise<void> {
    const promises = conversations.map(conv => 
      this.detectUserRole(conv._id, userId).catch(() => {
        return null;
      })
    );

    await Promise.allSettled(promises);
  }

  


  getRoleBasedConfig(role: 'client' | 'booster' | 'unknown') {
    const configs = {
      client: {
        actions: ['view_proposal', 'report_service', 'renegotiate'],
        canConfirmDelivery: false,
        canCancelService: true,
        theme: 'client'
      },
      booster: {
        actions: ['view_proposal', 'confirm_delivery', 'renegotiate'],
        canConfirmDelivery: true,
        canCancelService: true,
        theme: 'booster'
      },
      unknown: {
        actions: ['view_proposal'],
        canConfirmDelivery: false,
        canCancelService: false,
        theme: 'default'
      }
    };

    return configs[role];
  }
}

export const userRoleDetectionService = new UserRoleDetectionService();
export default userRoleDetectionService;
