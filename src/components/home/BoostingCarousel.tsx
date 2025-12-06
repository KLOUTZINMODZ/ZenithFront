import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock } from 'lucide-react';
import { BoostingRequest } from '../../services/homeService';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/currency';
import { useDevice } from '../../hooks/useDevice';

interface BoostingCarouselProps {
  requests: BoostingRequest[];
}

export const BoostingCarousel: React.FC<BoostingCarouselProps> = ({ requests }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isMobile } = useDevice();

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <TrendingUp className="w-20 h-20 mx-auto mb-4 opacity-30" />
        <p className="text-lg">Nenhum pedido de boosting disponível</p>
      </div>
    );
  }

  const visibleRequests = isMobile ? requests.slice(0, 4) : requests.slice(0, 3);

  return (
    <div className={`relative ${
      isMobile ? '' : ''
    }`}>
      {}
      <div
        ref={scrollContainerRef}
        className={`grid ${
          isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-3 gap-4'
        }`}
      >
        {visibleRequests.map((request, index) => (
          <motion.div
            key={request._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`flex-shrink-0 w-full bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl overflow-hidden border border-gray-700/50 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer group`}
            onClick={() => navigate(`/boosting/${request._id}/proposals`)}
          >
            <div className="p-4">
              {}
              <div className="flex items-center justify-between mb-3">
                <div className="bg-blue-600/20 backdrop-blur-sm text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase">
                  {request.game || 'Jogo'}
                </div>
                <Clock className="w-4 h-4 text-gray-500" />
              </div>

              {}
              {request.currentRank && request.desiredRank ? (
                <div className="bg-gray-900/60 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-500 text-[10px] font-semibold mb-1">Elo Atual</p>
                      <p className="text-white font-bold text-sm truncate">
                        {request.currentRank}
                      </p>
                    </div>
                    <div className="px-3">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-gray-500 text-[10px] font-semibold mb-1">Elo Desejado</p>
                      <p className="text-purple-400 font-bold text-sm truncate">
                        {request.desiredRank}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900/60 rounded-lg p-3 mb-3">
                  <div className="text-center">
                    <p className="text-gray-500 text-[10px] font-semibold mb-1">Categoria</p>
                    <p className="text-purple-400 font-bold text-sm truncate">
                      {request.boostingCategory || request.title || 'Boosting'}
                    </p>
                  </div>
                </div>
              )}

              {}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-500 text-[10px] mb-1">Tempo Estimado</p>
                  <p className="text-gray-300 text-sm font-semibold">12h</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-[10px] mb-1">Valor</p>
                  <p className="text-green-400 font-bold text-base">
                    {formatCurrency(request.price || request.minPrice || 0, true)}
                  </p>
                </div>
              </div>

              {}
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                Ver Detalhes
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {}
    </div>
  );
};
