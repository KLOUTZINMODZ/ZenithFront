import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, Shield, Package, Clock, Mail, MessageCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'Como funciona a proteção TradeShield?',
      answer: 'Garantia de 5 a 14 dias, cobrindo problemas de funcionamento, banimento ou recuperação da conta. Durante este período, você está totalmente protegido e pode solicitar reembolso se houver qualquer problema.',
      icon: <Shield className="w-5 h-5 text-green-400" />
    },
    {
      question: 'Quais contas posso vender?',
      answer: 'Apenas contas com acesso total e legítimo. Contas hackeadas, roubadas ou compartilhadas são estritamente proibidas. Você deve ter acesso completo ao e-mail e login da conta para vendê-la.',
      icon: <Package className="w-5 h-5 text-purple-400" />
    },
    {
      question: 'O que acontece se eu atrasar a entrega?',
      answer: 'Atrasos ocasionais comunicados previamente ao comprador não geram penalidade. No entanto, atrasos recorrentes podem resultar em reembolso automático e impactar negativamente sua reputação como vendedor.',
      icon: <Clock className="w-5 h-5 text-yellow-400" />
    },
    {
      question: 'Posso usar outro domínio de e-mail?',
      answer: 'Sim, desde que seja seguro, funcional e suporte inglês. Recomendamos usar domínios reconhecidos como Gmail, Outlook, Yahoo, AOL ou Protonmail para garantir melhor entrega de notificações.',
      icon: <Mail className="w-5 h-5 text-blue-400" />
    },
    {
      question: 'Como entrar em contato com o suporte?',
      answer: 'Pelo painel do usuário, na seção "Ajuda / Suporte". Nosso atendimento está disponível diariamente, com prioridade a disputas ativas. Responderemos o mais rápido possível para resolver sua questão.',
      icon: <MessageCircle className="w-5 h-5 text-purple-400" />
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl"
    >
      {}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
          <HelpCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-white mb-4">
          FAQ / Suporte
        </h1>
        <p className="text-gray-400">
          Perguntas frequentes e como obter ajuda
        </p>
      </div>

      {}
      <div className="space-y-4 mb-16">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-colors"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {faq.icon}
                <h3 className="text-lg font-semibold text-white">
                  {faq.question}
                </h3>
              </div>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5 pt-2">
                    <p className="text-gray-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-8">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">
            Precisa de Mais Ajuda?
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Nossa equipe de suporte está pronta para ajudar. Entre em contato através do painel do usuário na seção "Ajuda / Suporte".
          </p>
        </div>
      </div>

      {}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/terms"
          className="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-purple-500/50"
        >
          <p className="text-white font-semibold mb-1">Termos de Uso</p>
          <p className="text-gray-400 text-sm">Regras da plataforma</p>
        </Link>
        <Link
          to="/privacy"
          className="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-purple-500/50"
        >
          <p className="text-white font-semibold mb-1">Privacidade</p>
          <p className="text-gray-400 text-sm">Como usamos seus dados</p>
        </Link>
        <Link
          to="/refund"
          className="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-purple-500/50"
        >
          <p className="text-white font-semibold mb-1">Reembolsos</p>
          <p className="text-gray-400 text-sm">Política de devolução</p>
        </Link>
        <Link
          to="/seller-terms"
          className="bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-center transition-colors border border-gray-700 hover:border-purple-500/50"
        >
          <p className="text-white font-semibold mb-1">Vendedores</p>
          <p className="text-gray-400 text-sm">Termos para sellers</p>
        </Link>
      </div>
    </motion.div>
  );
};

export default FAQPage;
