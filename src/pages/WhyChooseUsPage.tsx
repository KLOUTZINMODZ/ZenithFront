import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Users, DollarSign, Lock, TrendingUp, Star, Award } from 'lucide-react';

const WhyChooseUsPage: React.FC = () => {
  const features = [
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Sistema de escrow que protege compradores e vendedores em todas as transações.',
      color: 'from-blue-500 to-blue-600',
      highlights: ['Pagamento seguro', 'Proteção contra fraudes', 'Suporte 24/7']
    },
    {
      icon: Zap,
      title: 'Transações Rápidas',
      description: 'Processos automatizados garantem rapidez e eficiência em todas as operações.',
      color: 'from-purple-500 to-purple-600',
      highlights: ['Entrega instantânea', 'Processamento automático', 'Interface otimizada']
    },
    {
      icon: Users,
      title: 'Comunidade Ativa',
      description: 'Milhares de gamers confiam em nossa plataforma para comprar, vender e trocar.',
      color: 'from-green-500 to-green-600',
      highlights: ['10.000+ usuários ativos', 'Comunidade engajada', 'Feedback constante']
    },
    {
      icon: DollarSign,
      title: 'Melhores Preços',
      description: 'Marketplace competitivo com os melhores preços do mercado gamer.',
      color: 'from-yellow-500 to-yellow-600',
      highlights: ['Preços justos', 'Taxas transparentes', 'Sem custos ocultos']
    },
    {
      icon: Lock,
      title: 'Dados Protegidos',
      description: 'Criptografia de ponta a ponta para garantir a privacidade de suas informações.',
      color: 'from-red-500 to-red-600',
      highlights: ['SSL/TLS', 'Dados criptografados', 'LGPD compliance']
    },
    {
      icon: TrendingUp,
      title: 'Boosting Premium',
      description: 'Boosters verificados e profissionais para elevar seu rank com segurança.',
      color: 'from-indigo-500 to-indigo-600',
      highlights: ['Boosters verificados', 'Ranking transparente', 'Resultados garantidos']
    }
  ];

  const stats = [
    { icon: Users, value: '10.000+', label: 'Usuários Ativos' },
    { icon: Award, value: '50.000+', label: 'Transações Realizadas' },
    { icon: Star, value: '4.9/5', label: 'Avaliação Média' },
    { icon: Shield, value: '99.9%', label: 'Taxa de Sucesso' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl"
    >
      {}
      <div className="text-center mb-16">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-purple-500/30"
        >
          <Star className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-4xl lg:text-5xl font-black text-white mb-4">
          Por que nos escolher?
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Somos a plataforma mais confiável do Brasil para compra, venda e boosting de contas de jogos
        </p>
      </div>

      {}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/60 text-center"
          >
            <stat.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
            <div className="text-xs text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/60 hover:border-purple-500/50 transition-all group"
          >
            {}
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <feature.icon className="w-7 h-7 text-white" />
            </div>

            {}
            <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-400 transition-colors">
              {feature.title}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              {feature.description}
            </p>

            {}
            <ul className="space-y-1">
              {feature.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-1 h-1 rounded-full bg-purple-500"></span>
                  {highlight}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-8 lg:p-12 border border-purple-500/30 text-center"
      >
        <h2 className="text-3xl lg:text-4xl font-black text-white mb-4">
          Pronto para começar?
        </h2>
        <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
          Junte-se a milhares de gamers que confiam na nossa plataforma para transações seguras e rápidas
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/marketplace"
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/30"
          >
            Explorar Marketplace
          </a>
          <a
            href="/browse-boostings"
            className="px-8 py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition-all border border-gray-700"
          >
            Ver Boostings
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WhyChooseUsPage;
