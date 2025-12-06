import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Shield, Clock, AlertCircle, CheckCircle } from 'lucide-react';

const RefundPolicyPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl"
    >
      {}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-green-500/30">
          <RefreshCw className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-white mb-4">
          Política de Reembolso
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
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Proteção TradeShield</h2>
          </div>
          <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 rounded-xl p-6">
            <p className="text-gray-300 leading-relaxed mb-4">
              Todas as contas têm proteção <strong className="text-green-400">TradeShield</strong> de:
            </p>
            <div className="flex items-center justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="text-4xl font-black text-green-400 mb-2">5</div>
                <div className="text-gray-400 text-sm">dias mínimo</div>
              </div>
              <div className="text-gray-500 text-3xl">→</div>
              <div className="text-center">
                <div className="text-4xl font-black text-green-400 mb-2">14</div>
                <div className="text-gray-400 text-sm">dias máximo</div>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Garantindo que o comprador seja <strong className="text-white">reembolsado</strong> se a conta deixar de funcionar, for banida ou recuperada neste período.
            </p>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Quando o Reembolso é Aplicado</h2>
          </div>
          <p className="text-gray-300 leading-relaxed mb-4">
            O reembolso é aplicado quando:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-green-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-white font-semibold mb-1">Conta Não Funciona ou Recuperada</p>
                <p className="text-gray-400 text-sm">
                  A conta deixa de funcionar ou é recuperada sem culpa do comprador
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
              <span className="text-green-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-white font-semibold mb-1">Serviço Diferente do Anunciado</p>
                <p className="text-gray-400 text-sm">
                  O serviço entregue difere significativamente do que foi anunciado
                </p>
              </div>
            </div>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Após o Período de Proteção</h2>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
            <p className="text-gray-300 leading-relaxed">
              Após o período de proteção, o vendedor <strong className="text-white">ainda pode ser responsabilizado</strong> se a conta for recuperada ou houver má-fé comprovada.
            </p>
          </div>
        </section>

        {}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Como Solicitar Reembolso</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-700/50 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Abrir Disputa</h3>
                  <p className="text-gray-400 text-sm">
                    O comprador deve abrir disputa <strong className="text-white">dentro do prazo de proteção</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Enviar Evidências</h3>
                  <p className="text-gray-400 text-sm">
                    Fornecer prints, vídeos ou outras provas do problema encontrado
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Análise da ZenithGG</h3>
                  <p className="text-gray-400 text-sm">
                    Nossa equipe analisará o caso e decidirá sobre o reembolso de forma justa
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="border-t border-gray-700/50 pt-10">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Importante
            </h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Disputas devem ser abertas dentro do período de proteção</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Evidências claras aumentam as chances de aprovação</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Todas as decisões são finais e baseadas nas provas apresentadas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Má-fé de qualquer parte pode resultar em banimento</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default RefundPolicyPage;
