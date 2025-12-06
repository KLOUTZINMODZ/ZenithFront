import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Users, DollarSign, Lock, TrendingUp } from 'lucide-react';

export const WhyChooseUs: React.FC = () => {
  const features = [
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Sistema de escrow que protege compradores e vendedores em todas as transações.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Zap,
      title: 'Transações Rápidas',
      description: 'Processos automatizados garantem rapidez e eficiência em todas as operações.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Users,
      title: 'Comunidade Ativa',
      description: 'Milhares de gamers confiam em nossa plataforma para comprar, vender e trocar.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: DollarSign,
      title: 'Melhores Preços',
      description: 'Marketplace competitivo com os melhores preços do mercado gamer.',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      icon: Lock,
      title: 'Dados Protegidos',
      description: 'Criptografia de ponta a ponta para garantir a privacidade de suas informações.',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: TrendingUp,
      title: 'Boosting Premium',
      description: 'Boosters verificados e profissionais para elevar seu rank com segurança.',
      color: 'from-indigo-500 to-indigo-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/60 hover:border-purple-500/50 transition-all group"
        >
          {}
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <feature.icon className="w-7 h-7 text-white" />
          </div>

          {}
          <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-400 transition-colors">
            {feature.title}
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            {feature.description}
          </p>
        </motion.div>
      ))}
    </div>
  );
};
