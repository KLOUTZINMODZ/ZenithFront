import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Database, UserCheck } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
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
          <Lock className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-white mb-4">
          Política de Privacidade
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
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Coleta de Informações</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Coletamos apenas informações necessárias para registro, autenticação, pagamento e entrega de pedidos, incluindo:
          </p>
          <ul className="mt-4 space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>E-mail e login</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Histórico de pedidos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Mensagens e comunicações</span>
            </li>
          </ul>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <UserCheck className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Uso dos Dados</h2>
          </div>
          <p className="text-gray-300 leading-relaxed mb-4">
            As informações coletadas são utilizadas para:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-purple-400 font-bold">1.</span>
              <div>
                <p className="text-white font-semibold">Processamento de pedidos</p>
                <p className="text-gray-400 text-sm">Garantir que suas transações sejam concluídas corretamente</p>
              </div>
            </li>
            <li className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-purple-400 font-bold">2.</span>
              <div>
                <p className="text-white font-semibold">Garantia de segurança</p>
                <p className="text-gray-400 text-sm">Proteger sua conta e dados pessoais</p>
              </div>
            </li>
            <li className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-purple-400 font-bold">3.</span>
              <div>
                <p className="text-white font-semibold">Prevenção de fraudes</p>
                <p className="text-gray-400 text-sm">Identificar e bloquear atividades suspeitas</p>
              </div>
            </li>
            <li className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-purple-400 font-bold">4.</span>
              <div>
                <p className="text-white font-semibold">Melhoria da experiência</p>
                <p className="text-gray-400 text-sm">Aprimorar nossos serviços e funcionalidades</p>
              </div>
            </li>
          </ul>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Compartilhamento de Dados</h2>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
            <p className="text-gray-300 leading-relaxed mb-4">
              Os dados <strong className="text-white">não são compartilhados com terceiros</strong>, exceto quando necessário para:
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">✓</span>
                <span>Processadores de pagamento (para completar transações)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">✓</span>
                <span>Parceiros de serviço (para entrega de pedidos)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">✓</span>
                <span>Cumprimento de obrigações legais</span>
              </li>
            </ul>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Recomendações de E-mail</h2>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <p className="text-gray-300 leading-relaxed mb-4">
              É recomendado usar domínios de e-mail reconhecidos internacionalmente:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {['Gmail', 'Outlook/Hotmail', 'Yahoo/Ymail', 'AOL', 'Protonmail'].map((provider) => (
                <span
                  key={provider}
                  className="px-3 py-1 bg-blue-600/30 text-blue-200 rounded-full text-sm font-medium"
                >
                  {provider}
                </span>
              ))}
            </div>
            <p className="text-gray-400 text-sm">
              Se usar outro domínio, ele deve ser seguro e com suporte ao inglês.
            </p>
          </div>
        </section>

        {}
        <section className="border-t border-gray-700/50 pt-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Seus Direitos</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento. 
            Para exercer esses direitos, entre em contato através do painel de suporte.
          </p>
        </section>
      </div>
    </motion.div>
  );
};

export default PrivacyPolicyPage;
