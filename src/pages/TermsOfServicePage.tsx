import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Ban, Users, AlertTriangle } from 'lucide-react';

const TermsOfServicePage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl"
    >
      {}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-purple-500/30">
          <FileText className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-white mb-4">
          Termos de Uso
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
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Aceitação dos Termos</h2>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
            <p className="text-gray-300 leading-relaxed">
              Ao usar a plataforma <strong className="text-white">ZenithGG</strong>, você concorda com todas as regras e políticas da seção de contas e marketplace.
            </p>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Papel da Plataforma</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            A plataforma atua como <strong className="text-white">intermediária entre compradores e vendedores</strong>, oferecendo:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-white font-semibold">Segurança</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-white font-semibold">Proteção</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-white font-semibold">Suporte</p>
            </div>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Ban className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Regras de Contas</h2>
          </div>
          
          <div className="space-y-4">
            {}
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                <span className="text-2xl">✓</span>
                Permitido
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Somente <strong className="text-white">contas com acesso total</strong> (incluindo login e e-mail) podem ser vendidas.
              </p>
            </div>

            {}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                <span className="text-2xl">✗</span>
                Estritamente Proibido
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Contas compartilhadas, alugadas ou sem acesso completo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Contas ilegais, hackeadas ou obtidas de forma ilícita</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Acessar, recuperar ou usar uma conta vendida após a entrega (exceto a pedido do comprador)</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Conduta do Usuário</h2>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-6">
            <p className="text-gray-300 leading-relaxed mb-4">
              Todos os usuários devem manter <strong className="text-white">respeito e profissionalismo</strong>, evitando:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <li className="bg-gray-800 rounded-lg p-3 text-center">
                <span className="text-red-400 text-2xl mb-2 block">🚫</span>
                <span className="text-gray-300 text-sm">Palavrões</span>
              </li>
              <li className="bg-gray-800 rounded-lg p-3 text-center">
                <span className="text-red-400 text-2xl mb-2 block">⚠️</span>
                <span className="text-gray-300 text-sm">Ameaças</span>
              </li>
              <li className="bg-gray-800 rounded-lg p-3 text-center">
                <span className="text-red-400 text-2xl mb-2 block">🛑</span>
                <span className="text-gray-300 text-sm">Assédio</span>
              </li>
            </ul>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Penalidades</h2>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
            <p className="text-gray-300 leading-relaxed">
              A <strong className="text-white">ZenithGG</strong> pode <strong className="text-yellow-400">suspender ou remover</strong> contas ou anúncios que violem essas regras, sem aviso prévio.
            </p>
          </div>
        </section>

        {}
        <section className="border-t border-gray-700/50 pt-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Alterações nos Termos</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            A ZenithGG reserva-se o direito de modificar estes termos a qualquer momento. 
            As alterações entram em vigor imediatamente após a publicação. 
            É responsabilidade do usuário revisar os termos periodicamente.
          </p>
        </section>
      </div>
    </motion.div>
  );
};

export default TermsOfServicePage;
