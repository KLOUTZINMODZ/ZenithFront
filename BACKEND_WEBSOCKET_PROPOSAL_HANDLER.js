/**
 * EXEMPLO DE IMPLEMENTAÇÃO BACKEND
 * Arquivo: HackloteChatApi/src/websocket/handlers/ProposalWebSocketHandler.js
 * 
 * Este arquivo deve ser colocado no backend (HackloteChatApi)
 * e integrado ao sistema WebSocket existente.
 */

class ProposalWebSocketHandler {
  constructor(wss) {
    this.wss = wss;
    // Map: boostingId -> Set<clientId>
    this.boostingSubscriptions = new Map();
    
    console.log('[ProposalWS Handler] Initialized');
  }

  /**
   * Processa inscrição de um cliente em um boosting específico
   * @param {WebSocket} client - Cliente WebSocket
   * @param {Object} message - Mensagem { type, boostingId }
   */
  handleSubscribe(client, message) {
    const { boostingId } = message;
    
    if (!boostingId) {
      client.send(JSON.stringify({
        type: 'error',
        error: 'boostingId is required for subscription'
      }));
      return;
    }

    // Garantir que o cliente tenha um ID único
    if (!client.id) {
      console.error('[ProposalWS] Client without ID trying to subscribe');
      return;
    }

    // Adicionar cliente ao set de subscribers deste boosting
    if (!this.boostingSubscriptions.has(boostingId)) {
      this.boostingSubscriptions.set(boostingId, new Set());
    }
    this.boostingSubscriptions.get(boostingId).add(client.id);

    console.log(`[ProposalWS] Client ${client.id} subscribed to boosting ${boostingId}`);
    console.log(`[ProposalWS] Total subscribers for ${boostingId}: ${this.boostingSubscriptions.get(boostingId).size}`);

    // Confirmar inscrição
    client.send(JSON.stringify({
      type: 'proposal:subscribed',
      boostingId,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Processa cancelamento de inscrição
   * @param {WebSocket} client - Cliente WebSocket
   * @param {Object} message - Mensagem { type, boostingId }
   */
  handleUnsubscribe(client, message) {
    const { boostingId } = message;
    
    if (!boostingId || !client.id) return;

    const subscribers = this.boostingSubscriptions.get(boostingId);
    if (subscribers) {
      subscribers.delete(client.id);
      
      console.log(`[ProposalWS] Client ${client.id} unsubscribed from boosting ${boostingId}`);
      
      // Remover set vazio para economizar memória
      if (subscribers.size === 0) {
        this.boostingSubscriptions.delete(boostingId);
        console.log(`[ProposalWS] No more subscribers for boosting ${boostingId}, removed from map`);
      }
    }

    // Confirmar cancelamento
    try {
      client.send(JSON.stringify({
        type: 'proposal:unsubscribed',
        boostingId,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('[ProposalWS] Error sending unsubscribe confirmation:', error);
    }
  }

  /**
   * Broadcast: Nova proposta criada
   * Chamado quando uma nova proposta é criada
   * @param {String} boostingId - ID do pedido de boosting
   * @param {Object} proposal - Objeto da proposta criada
   */
  broadcastNewProposal(boostingId, proposal) {
    const subscribers = this.boostingSubscriptions.get(boostingId);
    
    if (!subscribers || subscribers.size === 0) {
      console.log(`[ProposalWS] No subscribers for boosting ${boostingId}, skipping broadcast`);
      return;
    }

    const message = JSON.stringify({
      type: 'proposal:new',
      boostingId,
      data: { 
        proposal: proposal.toObject ? proposal.toObject() : proposal 
      },
      timestamp: new Date().toISOString()
    });

    console.log(`[ProposalWS] Broadcasting new proposal to ${subscribers.size} clients for boosting ${boostingId}`);

    let broadcastCount = 0;
    this.wss.clients.forEach(client => {
      if (subscribers.has(client.id) && client.readyState === 1) { // 1 = OPEN
        try {
          client.send(message);
          broadcastCount++;
        } catch (error) {
          console.error(`[ProposalWS] Error broadcasting to client ${client.id}:`, error);
        }
      }
    });

    console.log(`[ProposalWS] Successfully broadcasted new proposal to ${broadcastCount}/${subscribers.size} clients`);
  }

  /**
   * Broadcast: Proposta atualizada
   * @param {String} boostingId - ID do pedido de boosting
   * @param {Object} proposal - Proposta atualizada
   */
  broadcastProposalUpdated(boostingId, proposal) {
    const subscribers = this.boostingSubscriptions.get(boostingId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify({
      type: 'proposal:updated',
      boostingId,
      data: { 
        proposal: proposal.toObject ? proposal.toObject() : proposal 
      },
      timestamp: new Date().toISOString()
    });

    console.log(`[ProposalWS] Broadcasting updated proposal to ${subscribers.size} clients`);

    this.wss.clients.forEach(client => {
      if (subscribers.has(client.id) && client.readyState === 1) {
        try {
          client.send(message);
        } catch (error) {
          console.error(`[ProposalWS] Error broadcasting update:`, error);
        }
      }
    });
  }

  /**
   * Broadcast: Proposta aceita
   * @param {String} boostingId - ID do pedido de boosting
   * @param {String} proposalId - ID da proposta aceita
   * @param {String} conversationId - ID da conversa criada
   */
  broadcastProposalAccepted(boostingId, proposalId, conversationId) {
    const subscribers = this.boostingSubscriptions.get(boostingId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify({
      type: 'proposal:accepted',
      boostingId,
      data: { 
        proposalId, 
        conversationId 
      },
      timestamp: new Date().toISOString()
    });

    console.log(`[ProposalWS] Broadcasting proposal accepted to ${subscribers.size} clients`);

    this.wss.clients.forEach(client => {
      if (subscribers.has(client.id) && client.readyState === 1) {
        try {
          client.send(message);
        } catch (error) {
          console.error(`[ProposalWS] Error broadcasting acceptance:`, error);
        }
      }
    });
  }

  /**
   * Broadcast: Proposta rejeitada
   * @param {String} boostingId - ID do pedido de boosting
   * @param {String} proposalId - ID da proposta rejeitada
   */
  broadcastProposalRejected(boostingId, proposalId) {
    const subscribers = this.boostingSubscriptions.get(boostingId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify({
      type: 'proposal:rejected',
      boostingId,
      data: { proposalId },
      timestamp: new Date().toISOString()
    });

    console.log(`[ProposalWS] Broadcasting proposal rejected to ${subscribers.size} clients`);

    this.wss.clients.forEach(client => {
      if (subscribers.has(client.id) && client.readyState === 1) {
        try {
          client.send(message);
        } catch (error) {
          console.error(`[ProposalWS] Error broadcasting rejection:`, error);
        }
      }
    });
  }

  /**
   * Broadcast: Proposta cancelada
   * @param {String} boostingId - ID do pedido de boosting
   * @param {String} proposalId - ID da proposta cancelada
   */
  broadcastProposalCancelled(boostingId, proposalId) {
    const subscribers = this.boostingSubscriptions.get(boostingId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify({
      type: 'proposal:cancelled',
      boostingId,
      data: { proposalId },
      timestamp: new Date().toISOString()
    });

    console.log(`[ProposalWS] Broadcasting proposal cancelled to ${subscribers.size} clients`);

    this.wss.clients.forEach(client => {
      if (subscribers.has(client.id) && client.readyState === 1) {
        try {
          client.send(message);
        } catch (error) {
          console.error(`[ProposalWS] Error broadcasting cancellation:`, error);
        }
      }
    });
  }

  /**
   * Broadcast: Pedido de boosting cancelado
   * Notifica todos os subscribers e limpa as inscrições
   * @param {String} boostingId - ID do pedido cancelado
   */
  broadcastBoostingCancelled(boostingId) {
    const subscribers = this.boostingSubscriptions.get(boostingId);
    if (!subscribers || subscribers.size === 0) {
      console.log(`[ProposalWS] No subscribers for cancelled boosting ${boostingId}`);
      return;
    }

    const message = JSON.stringify({
      type: 'boosting:cancelled',
      boostingId,
      timestamp: new Date().toISOString()
    });

    console.log(`[ProposalWS] Broadcasting boosting cancelled to ${subscribers.size} clients`);

    this.wss.clients.forEach(client => {
      if (subscribers.has(client.id) && client.readyState === 1) {
        try {
          client.send(message);
        } catch (error) {
          console.error(`[ProposalWS] Error broadcasting boosting cancellation:`, error);
        }
      }
    });

    // Limpar todas as inscrições deste boosting
    this.boostingSubscriptions.delete(boostingId);
    console.log(`[ProposalWS] Cleaned up subscriptions for cancelled boosting ${boostingId}`);
  }

  /**
   * Cleanup quando cliente desconecta
   * Remove o cliente de todas as suas inscrições
   * @param {String} clientId - ID do cliente desconectado
   */
  handleClientDisconnect(clientId) {
    if (!clientId) return;

    console.log(`[ProposalWS] Cleaning up subscriptions for disconnected client ${clientId}`);
    
    let removedCount = 0;
    
    // Remover cliente de todas as inscrições
    this.boostingSubscriptions.forEach((subscribers, boostingId) => {
      if (subscribers.has(clientId)) {
        subscribers.delete(clientId);
        removedCount++;
        
        // Remover set vazio
        if (subscribers.size === 0) {
          this.boostingSubscriptions.delete(boostingId);
        }
      }
    });

    if (removedCount > 0) {
      console.log(`[ProposalWS] Removed client ${clientId} from ${removedCount} subscriptions`);
    }
  }

  /**
   * Obtém estatísticas do handler
   * @returns {Object} Estatísticas
   */
  getStats() {
    const stats = {
      totalBoostings: this.boostingSubscriptions.size,
      boostings: []
    };

    this.boostingSubscriptions.forEach((subscribers, boostingId) => {
      stats.boostings.push({
        boostingId,
        subscribers: subscribers.size
      });
    });

    return stats;
  }
}

module.exports = ProposalWebSocketHandler;

/**
 * EXEMPLO DE INTEGRAÇÃO NO WEBSOCKET SERVER
 * Arquivo: HackloteChatApi/src/websocket/websocketServer.js
 */

/*

const ProposalWebSocketHandler = require('./handlers/ProposalWebSocketHandler');

// Inicializar handler
const proposalHandler = new ProposalWebSocketHandler(wss);

// No connection handler
wss.on('connection', (ws, req) => {
  // ... código existente ...

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        // Handlers de propostas
        case 'proposal:subscribe':
          proposalHandler.handleSubscribe(ws, data);
          break;

        case 'proposal:unsubscribe':
          proposalHandler.handleUnsubscribe(ws, data);
          break;

        // ... outros cases existentes ...
        
        default:
          console.log('[WS] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[WS] Message handler error:', error);
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected:', ws.id);
    proposalHandler.handleClientDisconnect(ws.id);
    // ... cleanup existente ...
  });
});

// Exportar handler para uso em rotas
module.exports = { 
  wss, 
  proposalHandler // ← ADICIONAR ESTA EXPORTAÇÃO
};

*/

/**
 * EXEMPLO DE USO NAS ROTAS
 * Arquivo: HackloteChatApi/routes/boostingRoutes.js
 */

/*

const { proposalHandler } = require('../websocket/websocketServer');

// POST /api/boosting-requests/:boostingId/proposals
router.post('/:boostingId/proposals', authMiddleware, async (req, res) => {
  try {
    const { boostingId } = req.params;
    const { proposedPrice, estimatedTime, message } = req.body;
    const userId = req.user._id;

    // Criar proposta
    const proposal = await Proposal.create({
      boostingId,
      boosterId: userId,
      proposedPrice,
      estimatedTime,
      message,
      status: 'pending'
    });

    // Popular dados do booster
    await proposal.populate('boosterId', 'name avatar rating totalBoosts');

    // ✅ BROADCAST PARA TODOS OS SUBSCRIBERS
    proposalHandler.broadcastNewProposal(boostingId, proposal);

    res.json({
      success: true,
      data: { proposal }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// POST /api/boosting-requests/:boostingId/proposals/:proposalId/accept
router.post('/:boostingId/proposals/:proposalId/accept', authMiddleware, async (req, res) => {
  try {
    const { boostingId, proposalId } = req.params;
    const userId = req.user._id;

    // Verificar permissão
    const boosting = await BoostingRequest.findById(boostingId);
    if (boosting.clientId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Sem permissão' 
      });
    }

    // Aceitar proposta
    const proposal = await Proposal.findByIdAndUpdate(
      proposalId,
      { status: 'accepted' },
      { new: true }
    );

    // Criar conversa
    const conversation = await Conversation.create({
      boostingId,
      proposalId,
      participants: [userId, proposal.boosterId],
      isTemporary: false
    });

    // Atualizar boosting
    await BoostingRequest.findByIdAndUpdate(boostingId, {
      status: 'in_progress',
      isActive: false
    });

    // ✅ BROADCAST ACEITAÇÃO
    proposalHandler.broadcastProposalAccepted(
      boostingId,
      proposalId,
      conversation._id
    );

    res.json({
      success: true,
      data: { 
        proposal, 
        conversationId: conversation._id 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// DELETE /api/boosting-requests/:boostingId
router.delete('/:boostingId', authMiddleware, async (req, res) => {
  try {
    const { boostingId } = req.params;
    const userId = req.user._id;

    // Verificar permissão
    const boosting = await BoostingRequest.findById(boostingId);
    if (boosting.clientId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Sem permissão' 
      });
    }

    // Deletar boosting
    await BoostingRequest.findByIdAndDelete(boostingId);

    // Deletar propostas associadas
    await Proposal.deleteMany({ boostingId });

    // ✅ BROADCAST CANCELAMENTO
    proposalHandler.broadcastBoostingCancelled(boostingId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

*/
