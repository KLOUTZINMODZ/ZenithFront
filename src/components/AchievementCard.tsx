import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { getRarityColor, getRarityBg } from '../config/achievements';

interface AchievementCardProps {
  name: string;
  description: string;
  icon: any;
  color: string;
  rarity: string;
  unlocked: boolean;
  index: number;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  name,
  description,
  icon: Icon,
  color,
  rarity,
  unlocked,
  index
}) => {
  const rarityColor = getRarityColor(rarity);
  const rarityBg = getRarityBg(rarity);
  const isLegendary = rarity === 'lendario' && unlocked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-300 overflow-hidden min-h-[110px] ${
        unlocked
          ? `${rarityColor} ${rarityBg} hover:scale-105 cursor-pointer ${
              isLegendary ? 'shadow-xl shadow-yellow-500/20' : ''
            }`
          : 'border-gray-700 bg-gray-800/30 opacity-60'
      }`}
      style={isLegendary ? {
        boxShadow: '0 0 30px rgba(234, 179, 8, 0.15), inset 0 0 20px rgba(234, 179, 8, 0.05)'
      } : {}}
    >
      {}
      {isLegendary && (
        <>
          {}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: 'linear',
              repeatDelay: 2
            }}
          >
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent skew-x-12" />
          </motion.div>
          
          {}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full pointer-events-none"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
              }}
              animate={{
                y: [-10, -25, -10],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                repeat: Infinity,
                duration: 2 + i * 0.3,
                delay: i * 0.4,
                ease: 'easeInOut',
              }}
            />
          ))}
        </>
      )}
      {}
      {unlocked && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: index * 0.05 + 0.2, type: 'spring', stiffness: 200 }}
          className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-900 ${
            isLegendary 
              ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-xl shadow-yellow-500/50' 
              : 'bg-green-500 shadow-lg'
          }`}
        >
          {isLegendary ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
          ) : (
            <Sparkles className="w-4 h-4 text-white" />
          )}
        </motion.div>
      )}

      {}
      <div
        className={`relative w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${
          unlocked ? rarityBg : 'bg-gray-700/50'
        }`}
      >
        {isLegendary && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-yellow-400/20"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'easeInOut',
            }}
          />
        )}
        {unlocked ? (
          <motion.div
            animate={isLegendary ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'easeInOut',
            }}
          >
            <Icon className={`w-7 h-7 ${color} ${isLegendary ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]' : ''}`} />
          </motion.div>
        ) : (
          <div className="relative">
            <Icon className="w-7 h-7 text-gray-600" />
            <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-gray-500" />
          </div>
        )}
      </div>

      {}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4
            className={`font-semibold truncate ${
              unlocked ? (isLegendary ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200' : 'text-white') : 'text-gray-500'
            }`}
            title={name}
          >
            {name}
          </h4>
          <span
            className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${
              unlocked
                ? `${rarityBg} ${isLegendary ? 'text-yellow-300 font-bold' : color} border ${rarityColor}`
                : 'bg-gray-700/50 text-gray-500 border border-gray-600'
            }`}
          >
            {isLegendary && '⭐ '}{rarity.charAt(0).toUpperCase() + rarity.slice(1)}
          </span>
        </div>
        <p
          className={`text-sm line-clamp-2 ${unlocked ? 'text-gray-300' : 'text-gray-600'}`}
          title={description}
        >
          {description}
        </p>
      </div>
    </motion.div>
  );
};


export default memo(AchievementCard, (prevProps, nextProps) => {
  
  return (
    prevProps.name === nextProps.name &&
    prevProps.unlocked === nextProps.unlocked &&
    prevProps.index === nextProps.index
  );
});
