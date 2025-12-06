


import messageStorageManager from '../services/messageStorageManager';

interface TestMessage {
  _id: string;
  tempId?: string;
  content: string;
  sender: {
    _id: string;
    name: string;
  };
  type: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isTemporary?: boolean;
}

class MessageStorageTest {
  private testConversationId = 'test_conversation_123';
  private testUserId = 'test_user_456';

  


  async runCompleteTest(): Promise<boolean> {

    try {

      this.cleanTestData();


      const ownMessagesTest = await this.testOwnMessages();


      const receivedMessagesTest = await this.testReceivedMessages();


      const tempMessagesTest = await this.testTemporaryMessages();


      const persistenceTest = await this.testPersistenceAfterReload();


      const syncTest = await this.testStorageSync();

      const allTestsPassed = ownMessagesTest && receivedMessagesTest && tempMessagesTest && persistenceTest && syncTest;
      


      this.cleanTestData();

      return allTestsPassed;
    } catch (error) {
      this.cleanTestData();
      return false;
    }
  }

  


  private async testOwnMessages(): Promise<boolean> {
    const testMessages: TestMessage[] = [
      {
        _id: 'own_1',
        content: 'Minha mensagem 1',
        sender: { _id: this.testUserId, name: 'Você' },
        type: 'text',
        createdAt: new Date().toISOString(),
        status: 'sent'
      },
      {
        _id: 'own_2',
        content: 'Minha mensagem 2',
        sender: { _id: this.testUserId, name: 'Você' },
        type: 'text',
        createdAt: new Date(Date.now() + 1000).toISOString(),
        status: 'delivered'
      }
    ];


    for (const message of testMessages) {
      const success = messageStorageManager.saveMessage(this.testConversationId, message, this.testUserId);
      if (!success) {
        return false;
      }
    }


    const savedMessages = messageStorageManager.loadMessages(this.testConversationId);
    const ownMessages = savedMessages.filter(m => m.sender._id === this.testUserId);

    if (ownMessages.length !== testMessages.length) {
      return false;
    }


    for (const testMsg of testMessages) {
      const found = ownMessages.find(m => m._id === testMsg._id && m.content === testMsg.content);
      if (!found) {
        return false;
      }
    }

    return true;
  }

  


  private async testReceivedMessages(): Promise<boolean> {
    const otherUserId = 'other_user_789';
    const testMessages: TestMessage[] = [
      {
        _id: 'received_1',
        content: 'Mensagem recebida 1',
        sender: { _id: otherUserId, name: 'Outro Usuário' },
        type: 'text',
        createdAt: new Date(Date.now() + 2000).toISOString(),
        status: 'delivered'
      },
      {
        _id: 'received_2',
        content: 'Mensagem recebida 2',
        sender: { _id: otherUserId, name: 'Outro Usuário' },
        type: 'text',
        createdAt: new Date(Date.now() + 3000).toISOString(),
        status: 'read'
      }
    ];


    for (const message of testMessages) {
      const success = messageStorageManager.saveMessage(this.testConversationId, message, this.testUserId);
      if (!success) {
        return false;
      }
    }


    const savedMessages = messageStorageManager.loadMessages(this.testConversationId);
    const receivedMessages = savedMessages.filter(m => m.sender._id === otherUserId);

    if (receivedMessages.length !== testMessages.length) {
      return false;
    }

    return true;
  }

  


  private async testTemporaryMessages(): Promise<boolean> {
    const tempMessage: TestMessage = {
      _id: '',
      tempId: 'temp_123456',
      content: 'Mensagem temporária',
      sender: { _id: this.testUserId, name: 'Você' },
      type: 'text',
      createdAt: new Date(Date.now() + 4000).toISOString(),
      status: 'sending',
      isTemporary: true
    };


    const success = messageStorageManager.saveMessage(this.testConversationId, tempMessage, this.testUserId);
    if (!success) {
      return false;
    }


    const savedMessages = messageStorageManager.loadMessages(this.testConversationId, { includeTempMessages: true });
    const tempMessages = savedMessages.filter(m => m.tempId === tempMessage.tempId);

    if (tempMessages.length !== 1) {
      return false;
    }


    const confirmedMessage: TestMessage = {
      _id: 'confirmed_123',
      tempId: 'temp_123456',
      content: 'Mensagem temporária',
      sender: { _id: this.testUserId, name: 'Você' },
      type: 'text',
      createdAt: tempMessage.createdAt,
      status: 'sent',
      isTemporary: false
    };

    const confirmSuccess = messageStorageManager.saveMessage(this.testConversationId, confirmedMessage, this.testUserId);
    if (!confirmSuccess) {
      return false;
    }


    const updatedMessages = messageStorageManager.loadMessages(this.testConversationId);
    const confirmedMsg = updatedMessages.find(m => m._id === 'confirmed_123');

    if (!confirmedMsg || confirmedMsg.status === 'sending') {
      return false;
    }

    return true;
  }

  


  private async testPersistenceAfterReload(): Promise<boolean> {

    const messagesAfterReload = messageStorageManager.loadMessages(this.testConversationId);
    

    const ownMessages = messagesAfterReload.filter(m => m.sender._id === this.testUserId);
    
    if (ownMessages.length === 0) {
      return false;
    }


    const testContent = ['Minha mensagem 1', 'Minha mensagem 2', 'Mensagem temporária'];
    const persistedContent = ownMessages.map(m => m.content);

    let foundCount = 0;
    testContent.forEach(content => {
      if (persistedContent.includes(content)) {
        foundCount++;
      }
    });

    if (foundCount < 2) {
      return false;
    }

    return true;
  }

  


  private async testStorageSync(): Promise<boolean> {

    messageStorageManager.forceSyncStorage(this.testConversationId);


    const stats = messageStorageManager.getStorageStats();

    if (stats.syncStatus === 'error') {
      return false;
    }


    return true;
  }

  


  private cleanTestData(): void {
    messageStorageManager.clearStorage(this.testConversationId, false);
  }

  


  quickTest(): boolean {
    const testMessage = {
      _id: 'quick_test_' + Date.now(),
      content: 'Teste rápido',
      sender: { _id: this.testUserId, name: 'Você' },
      type: 'text',
      createdAt: new Date().toISOString(),
      status: 'sent' as const
    };

    const success = messageStorageManager.saveMessage(this.testConversationId, testMessage, this.testUserId);
    
    if (success) {
      const messages = messageStorageManager.loadMessages(this.testConversationId);
      const found = messages.find(m => m._id === testMessage._id);
      
      this.cleanTestData();
      return !!found;
    }

    this.cleanTestData();
    return false;
  }
}

export const messageStorageTest = new MessageStorageTest();
export default messageStorageTest;
