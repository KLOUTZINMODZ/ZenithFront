import React from 'react';
import { motion } from 'framer-motion';
import { Users, ShoppingBag, TrendingUp, Star } from 'lucide-react';
import { PlatformStats as StatsType } from '../../services/homeService';

interface PlatformStatsProps {
  stats: StatsType;
}

export const PlatformStats: React.FC<PlatformStatsProps> = ({ stats }) => {
  const statsData = [
    {
      icon: Users,
      value: stats.totalUsers.toLocaleString('pt-BR'),
      label: 'Usuários Ativos',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: ShoppingBag,
      value: stats.totalMarketItems.toLocaleString('pt-BR'),
      label: 'Items no Marketplace',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: TrendingUp,
      value: stats.totalBoostings.toLocaleString('pt-BR'),
      label: 'Boostings Realizados',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Star,
      value: stats.totalReviews.toLocaleString('pt-BR'),
      label: 'Avaliações',
      color: 'from-yellow-500 to-yellow-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className="bg-gray-800/60 rounded-xl p-4 md:p-6 border border-gray-700/60 hover:border-purple-500/50 transition-all"
        >
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
            <stat.icon className="w-6 h-6 text-white" />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white mb-1">
            {stat.value}
          </p>
          <p className="text-gray-400 text-xs md:text-sm">
            {stat.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
};
