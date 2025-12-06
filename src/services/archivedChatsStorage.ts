interface ArchivedChat {
  conversationId: string;
  conversation: any;
  messages: any[];
  archivedAt: number;
  expiresAt: number;
  deliveryConfirmedBy: string;
}

class ArchivedChatsStorage {
  private readonly STORAGE_KEY = 'hacklote_archived_chats';
  private readonly EXPIRY_DAYS = 7;


  archiveChat(conversationId: string, conversation: any, messages: any[], userId: string): void {
    try {
      const now = Date.now();
      const expiresAt = now + (this.EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      const archivedChat: ArchivedChat = {
        conversationId,
        conversation,
        messages,
        archivedAt: now,
        expiresAt,
        deliveryConfirmedBy: userId
      };

      const existingArchived = this.getAllArchivedChats();
      existingArchived[conversationId] = archivedChat;

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingArchived));
      
    } catch (error) {
    }
  }


  getAllArchivedChats(): Record<string, ArchivedChat> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return {};

      const archived: Record<string, ArchivedChat> = JSON.parse(stored);
      const now = Date.now();
      const validArchived: Record<string, ArchivedChat> = {};


      Object.keys(archived).forEach(conversationId => {
        const chat = archived[conversationId];
        if (chat.expiresAt > now) {
          validArchived[conversationId] = chat;
        } else {
        }
      });


      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validArchived));
      
      return validArchived;
    } catch (error) {
      return {};
    }
  }


  getArchivedChat(conversationId: string): ArchivedChat | null {
    const archived = this.getAllArchivedChats();
    return archived[conversationId] || null;
  }


  isChatArchived(conversationId: string): boolean {
    const archived = this.getAllArchivedChats();
    return conversationId in archived;
  }


  getArchivedConversations(userId: string): ArchivedChat[] {
    const archived = this.getAllArchivedChats();
    return Object.values(archived).filter(chat => 
      chat.deliveryConfirmedBy === userId ||
      chat.conversation.participants?.some((p: any) => p._id === userId)
    );
  }


  removeArchivedChat(conversationId: string): void {
    try {
      const archived = this.getAllArchivedChats();
      delete archived[conversationId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(archived));
    } catch (error) {
    }
  }


  cleanupExpiredChats(): number {
    const archived = this.getAllArchivedChats();
    const initialCount = Object.keys(archived).length;
    const validArchived = this.getAllArchivedChats();
    const finalCount = Object.keys(validArchived).length;
    
    return initialCount - finalCount;
  }


  getArchivedStats(): { total: number; expiringSoon: number; totalSize: string } {
    const archived = this.getAllArchivedChats();
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    const expiringSoon = Object.values(archived).filter(chat => 
      chat.expiresAt - now <= oneDayInMs
    ).length;

    const sizeInBytes = new Blob([JSON.stringify(archived)]).size;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

    return {
      total: Object.keys(archived).length,
      expiringSoon,
      totalSize: `${sizeInMB} MB`
    };
  }
}

export default new ArchivedChatsStorage();
