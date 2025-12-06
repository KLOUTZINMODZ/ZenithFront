import React from 'react';
import { motion } from 'framer-motion';
import { Store, Package, MessageSquare, Ban, Scale, Star, AlertTriangle, Clock } from 'lucide-react';

const SellerTermsPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl"
    >
      {}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-600 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-orange-500/30">
          <Store className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-white mb-4">
          Termos para Vendedores
        </h1>
        <p className="text-gray-400">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 lg:p-10 space-y-10 border border-gray-700/50 shadow-xl">
        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Store className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Requisitos Gerais</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-green-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-white font-semibold">Ter 18 anos ou mais</p>
                <p className="text-gray-400 text-sm">Maioridade legal para realizar transações comerciais</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-green-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-white font-semibold">Uma conta por vendedor</p>
                <p className="text-gray-400 text-sm">Salvo permissão expressa da plataforma</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-green-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-white font-semibold">Descrições originais e claras</p>
                <p className="text-gray-400 text-sm">Máximo de duas palavras-chave por anúncio</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-green-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-white font-semibold">Não usar imagens com copyright</p>
                <p className="text-gray-400 text-sm">Use apenas imagens próprias ou com direitos de uso</p>
              </div>
            </div>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Entrega de Pedidos</h2>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="text-white font-semibold mb-2">📦 Prazo de Entrega</h3>
              <p className="text-gray-300 text-sm">
                Entregar pedidos <strong className="text-white">dentro do prazo garantido</strong> ao comprador
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">⏰ Atrasos</h3>
              <p className="text-gray-300 text-sm">
                Avisar o comprador se houver atraso ou entrega parcial, <strong className="text-white">obtendo aprovação prévia</strong>
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">✅ Conclusão</h3>
              <p className="text-gray-300 text-sm">
                Marcar como entregue <strong className="text-white">somente quando o pedido estiver completo</strong>
              </p>
            </div>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <MessageSquare className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Conduta e Restrições</h2>
          </div>
          <div className="space-y-3">
            {}
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-5">
              <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2">
                <span className="text-xl">✓</span>
                Permitido
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>Comunicação apenas dentro da plataforma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>Transações exclusivamente pela ZenithGG</span>
                </li>
              </ul>
            </div>

            {}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-5">
              <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                <span className="text-xl">✗</span>
                Estritamente Proibido
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Compartilhar contatos externos (WhatsApp, Discord, e-mail, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Aceitar pagamentos fora da plataforma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Golpes, fraudes e práticas fraudulentas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Recuperação de contas vendidas sem ajudar o comprador</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Responsabilidades</h2>
          </div>
          <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-6">
            <p className="text-gray-300 leading-relaxed mb-4">
              <strong className="text-white">Vendedores são responsáveis pelas contas vendidas</strong>, mesmo em casos de revenda.
            </p>
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-300 font-semibold flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Tolerância Zero
              </p>
              <p className="text-gray-300 text-sm mt-2">
                Recuperação de contas vendidas sem ajudar o comprador pode resultar em <strong className="text-white">banimento permanente</strong>.
              </p>
            </div>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Scale className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Disputas</h2>
          </div>
          <p className="text-gray-300 mb-4">
            Responder a disputas <strong className="text-white">rapidamente</strong> com provas ou soluções:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-semibold">Contas/Boosting</h3>
              </div>
              <p className="text-gray-400 text-sm">Até <strong className="text-white">12 horas</strong> com provas ou solução</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">Moeda/Itens</h3>
              </div>
              <p className="text-gray-400 text-sm">Até <strong className="text-white">2 horas</strong> com provas</p>
            </div>
          </div>
          <div className="mt-4 bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-300 text-sm">
              <strong className="text-white">Importante:</strong> Se a disputa for resolvida a favor do comprador, o vendedor poderá recuperar a conta se possível.
            </p>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Boas Práticas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4">
              <p className="text-white font-semibold mb-1">📝 Descrições Claras</p>
              <p className="text-gray-400 text-sm">Objetivas e relevantes</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4">
              <p className="text-white font-semibold mb-1">🎯 Categoria Correta</p>
              <p className="text-gray-400 text-sm">Liste no lugar adequado</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4">
              <p className="text-white font-semibold mb-1">💲 Preços Realistas</p>
              <p className="text-gray-400 text-sm">Valores justos e competitivos</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4">
              <p className="text-white font-semibold mb-1">🤝 Respeito</p>
              <p className="text-gray-400 text-sm">Mantenha profissionalismo</p>
            </div>
          </div>
          <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-gray-300 text-sm">
              <strong className="text-red-400">Evite:</strong> Loterias, rifas, ofertas aleatórias ou práticas que violem os termos da plataforma
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default SellerTermsPage;
