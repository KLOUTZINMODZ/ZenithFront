import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Wallet, 
  Shield, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Star, 
  Package, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info,
  Users,
  MessageSquare,
  Lock,
  Sparkles,
  Target,
  CreditCard,
  FileText,
  Eye,
  Handshake,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

const HowItWorksPage: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('marketplace');

  const sections: Section[] = [
    {
      id: 'marketplace',
      title: 'Marketplace de Jogos',
      icon: <ShoppingCart className="w-6 h-6" />,
      description: 'Compre e venda itens, contas e skins de forma segura'
    },
    {
      id: 'boosting',
      title: 'Sistema de Boosting',
      icon: <TrendingUp className="w-6 h-6" />,
      description: 'Contrate ou ofereça serviços de boosting'
    },
    {
      id: 'wallet',
      title: 'Carteira Digital',
      icon: <Wallet className="w-6 h-6" />,
      description: 'Gerencie seu saldo com depósitos e saques via PIX'
    },
    {
      id: 'safety',
      title: 'Segurança e Proteção',
      icon: <Shield className="w-6 h-6" />,
      description: 'Conheça nossas medidas de segurança'
    }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
            Como Funciona
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Entenda todas as funcionalidades, regras e o funcionamento completo da nossa plataforma de marketplace de jogos
          </p>
        </motion.div>

        {}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12"
        >
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Package className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">50+</div>
            <div className="text-sm text-gray-400">Jogos Suportados</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">100%</div>
            <div className="text-sm text-gray-400">Seguro</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">24h</div>
            <div className="text-sm text-gray-400">Processamento PIX</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">5★</div>
            <div className="text-sm text-gray-400">Sistema de Avaliações</div>
          </div>
        </motion.div>

        {}
        <div className="space-y-4">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                    {section.icon}
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-white">{section.title}</h2>
                    <p className="text-sm text-gray-400">{section.description}</p>
                  </div>
                </div>
                {expandedSection === section.id ? (
                  <ChevronUp className="w-6 h-6 text-gray-400" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-gray-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedSection === section.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      {section.id === 'marketplace' && <MarketplaceSection />}
                      {section.id === 'boosting' && <BoostingSection />}
                      {section.id === 'wallet' && <WalletSection />}
                      {section.id === 'safety' && <SafetySection />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};


const MarketplaceSection: React.FC = () => (
  <div className="space-y-6 text-gray-300">
    <div>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Package className="w-5 h-5 text-purple-400" />
        Como Funciona o Marketplace
      </h3>
      <p className="mb-4">
        Nosso marketplace é uma plataforma completa para compra e venda de itens, contas, skins e outros produtos relacionados a jogos.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-white mb-1">Para Compradores</h4>
            <ul className="text-sm space-y-1">
              <li>• Navegue por 50+ jogos diferentes</li>
              <li>• Filtre por categoria, jogo e preço</li>
              <li>• Veja avaliações dos vendedores</li>
              <li>• Faça perguntas antes de comprar (até 5 por dia)</li>
              <li>• Pagamento seguro via saldo da carteira</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-white mb-1">Para Vendedores</h4>
            <ul className="text-sm space-y-1">
              <li>• Publique até R$ 99.999,99 por item</li>
              <li>• Adicione até 5 imagens por produto</li>
              <li>• Defina estoque (exceto para contas)</li>
              <li>• Receba o pagamento na carteira</li>
              <li>• Destaque seus anúncios (patrocínio)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-400" />
        Categorias Disponíveis
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['Conta', 'Item', 'Skin', 'Outro'].map(cat => (
          <div key={cat} className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30 rounded-lg p-3 text-center">
            <div className="text-white font-medium">{cat}</div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-blue-300 mb-2">Regras Importantes</h4>
          <ul className="text-sm space-y-1.5 text-blue-200">
            <li>• Itens vendidos são marcados como "Esgotado" automaticamente</li>
            <li>• Itens reservados não ficam visíveis para outros compradores</li>
            <li>• Sistema de estoque disponível para itens não-conta</li>
            <li>• Limite de 5 perguntas por dia no sistema de Q&A</li>
            <li>• Anúncios podem ser destacados no topo (patrocinados)</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);


const BoostingSection: React.FC = () => (
  <div className="space-y-6 text-gray-300">
    <div>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Target className="w-5 h-5 text-purple-400" />
        Sistema de Boosting
      </h3>
      <p className="mb-4">
        O sistema de boosting conecta jogadores que precisam melhorar seu rank com profissionais qualificados através de um sistema de propostas.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-white mb-1">Para Clientes</h4>
            <ul className="text-sm space-y-1">
              <li>• Publique seu pedido de boosting</li>
              <li>• Defina rank atual e desejado</li>
              <li>• Estabeleça um preço mínimo</li>
              <li>• Receba propostas de boosters</li>
              <li>• Escolha a melhor oferta</li>
              <li>• Acompanhe o progresso em tempo real</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Handshake className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-white mb-1">Para Boosters</h4>
            <ul className="text-sm space-y-1">
              <li>• Navegue pedidos abertos</li>
              <li>• Filtre por jogo e rank</li>
              <li>• Envie propostas competitivas</li>
              <li>• Negocie valores e prazos</li>
              <li>• Execute o serviço</li>
              <li>• Receba pagamento após conclusão</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
        <Eye className="w-5 h-5 text-yellow-400" />
        Status dos Pedidos
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { status: 'Aberto', color: 'green', desc: 'Aceitando propostas' },
          { status: 'Em Progresso', color: 'blue', desc: 'Serviço sendo realizado' },
          { status: 'Concluído', color: 'purple', desc: 'Serviço finalizado' },
          { status: 'Cancelado', color: 'red', desc: 'Pedido cancelado' }
        ].map(item => (
          <div key={item.status} className={`bg-${item.color}-900/20 border border-${item.color}-700/30 rounded-lg p-3`}>
            <div className={`text-${item.color}-300 font-medium text-sm mb-1`}>{item.status}</div>
            <div className="text-xs text-gray-400">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-purple-300 mb-2">Recursos do Sistema</h4>
          <ul className="text-sm space-y-1.5 text-purple-200">
            <li>• Notificações em tempo real via WebSocket</li>
            <li>• Sistema de chat integrado para negociação</li>
            <li>• Avaliações após conclusão do serviço</li>
            <li>• Filtros avançados de busca</li>
            <li>• Limite de 50 pedidos exibidos por vez</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);


const WalletSection: React.FC = () => (
  <div className="space-y-6 text-gray-300">
    <div>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-purple-400" />
        Carteira Digital
      </h3>
      <p className="mb-4">
        Gerencie seu saldo de forma segura com depósitos e saques via PIX, processados pela Asaas.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ArrowRight className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0 rotate-[-45deg]" />
          <div>
            <h4 className="font-semibold text-white mb-1">Depósitos</h4>
            <ul className="text-sm space-y-1">
              <li>• Depósito via PIX instantâneo</li>
              <li>• Chave PIX: CPF ou CNPJ</li>
              <li>• Sem taxa de depósito</li>
              <li>• QR Code gerado automaticamente</li>
              <li>• Confirmação em tempo real</li>
              <li>• Processamento via Asaas</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ArrowRight className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0 rotate-[45deg]" />
          <div>
            <h4 className="font-semibold text-white mb-1">Saques</h4>
            <ul className="text-sm space-y-1">
              <li>• Taxa fixa: R$ 5,00 por saque</li>
              <li>• Limite máximo: R$ 1.000.000,00</li>
              <li>• Limite diário: 1 saque por dia</li>
              <li>• Máximo: 5 saques em processamento</li>
              <li>• Processamento em até 24h</li>
              <li>• Chave PIX vinculada (imutável)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-yellow-300 mb-2">Regras de Segurança</h4>
          <ul className="text-sm space-y-1.5 text-yellow-200">
            <li>• <strong>Chave PIX:</strong> Cadastrada no primeiro saque e não pode ser alterada</li>
            <li>• <strong>Telefone não suportado:</strong> Use apenas CPF ou CNPJ como chave PIX</li>
            <li>• <strong>Limite de tentativas:</strong> 5 tentativas falhas = bloqueio de 1 hora</li>
            <li>• <strong>Saldo bloqueado (Escrow):</strong> Valor retido em transações ativas</li>
            <li>• <strong>Reset diário:</strong> Limite de saque reseta a cada 24h</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-400" />
        Tipos de Transação
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { tipo: 'Depósito', icon: '💰', color: 'green' },
          { tipo: 'Saque', icon: '💸', color: 'red' },
          { tipo: 'Compra', icon: '🛒', color: 'blue' },
          { tipo: 'Venda', icon: '💵', color: 'purple' }
        ].map(item => (
          <div key={item.tipo} className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-sm text-white font-medium">{item.tipo}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);


const SafetySection: React.FC = () => (
  <div className="space-y-6 text-gray-300">
    <div>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Lock className="w-5 h-5 text-purple-400" />
        Segurança e Proteção
      </h3>
      <p className="mb-4">
        Sua segurança é nossa prioridade. Implementamos múltiplas camadas de proteção para garantir transações seguras.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-white mb-1">Proteções Ativas</h4>
            <ul className="text-sm space-y-1">
              <li>• Processamento via API Asaas</li>
              <li>• Filtro de conteúdo proibido</li>
              <li>• Sistema de denúncias</li>
              <li>• Verificação de documentos</li>
              <li>• Saldo em escrow (bloqueado)</li>
              <li>• Notificações em tempo real</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-white mb-1">Sistema de Avaliações</h4>
            <ul className="text-sm space-y-1">
              <li>• Avaliações de vendedores</li>
              <li>• Histórico de transações</li>
              <li>• Rating visível publicamente</li>
              <li>• Contagem de vendas totais</li>
              <li>• Sistema de reputação</li>
              <li>• Feedback após cada transação</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-green-300 mb-2">Boas Práticas</h4>
          <ul className="text-sm space-y-1.5 text-green-200">
            <li>• Sempre verifique o perfil do vendedor antes de comprar</li>
            <li>• Leia as avaliações de outros compradores</li>
            <li>• Use o sistema de Q&A para tirar dúvidas</li>
            <li>• Nunca compartilhe senhas ou informações pessoais</li>
            <li>• Reporte conteúdo suspeito imediatamente</li>
            <li>• Mantenha sua chave PIX segura e privada</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-red-300 mb-2">Política de Segurança</h4>
          <ul className="text-sm space-y-1.5 text-red-200">
            <li>• Proibido venda de contas roubadas ou hackeadas</li>
            <li>• Filtro automático bloqueia conteúdo impróprio</li>
            <li>• Limite de perguntas diárias previne spam</li>
            <li>• Sistema anti-fraude monitora transações</li>
            <li>• Bloqueio automático após tentativas falhas</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

export default HowItWorksPage;
