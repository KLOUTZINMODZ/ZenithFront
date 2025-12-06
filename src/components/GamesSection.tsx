import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Users, Play, ShoppingBag } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  image: string;
  players: string;
  category: string;
  rating: number;
  price?: string;
  description: string;
}

const GamesSection: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  const games: Game[] = [
    {
      id: 'valorant',
      name: 'Valorant',
      image: 'https://imgs.search.brave.com/HVz8e7Om_K9I136-66HERdhiKwkDH0A9FvlZeHA_xGM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvMjQ0/MHgxNDQwLXZhbG9y/YW50LWJhY2tncm91/bmQtMjQ0MC14LTE0/NDAtNDYzenJhMXVj/bnFweWU2by5qcGc',
      players: '15.2M',
      category: 'FPS Tático',
      rating: 4.8,
      price: 'Grátis',
      description: 'Jogo de tiro tático 5v5 onde a precisão e estratégia são fundamentais.'
    },
    {
      id: 'lol',
      name: 'League of Legends',
      image: 'https://imgs.search.brave.com/M-V6uWuMChwzrRzP527uf7ZynwhW2uSY6F8ToJ548Vk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvc3Ry/aWtpbmctbGVhZ3Vl/LW9mLWxlZ2VuZHMt/bG9nby0zeXdvMDk0/eTRhanBndmkwLmpw/Zw',
      players: '180M',
      category: 'MOBA',
      rating: 4.6,
      price: 'Grátis',
      description: 'MOBA competitivo com mais de 150 campeões únicos para dominar.'
    },
    {
      id: 'gta5',
      name: 'GTA V',
      image: 'https://imgs.search.brave.com/J1jlarJURTilH6lOrEFC7YzJjCF7mQYIe9nPGFWt2D0/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJhY2Nlc3Mu/Y29tL2Z1bGwvMzQw/MTE5OS5qcGc',
      players: '120M',
      category: 'Action',
      rating: 4.7,
      price: 'R$ 89,90',
      description: 'Mundo aberto com história épica e multiplayer expansivo.'
    },
    {
      id: 'cs2',
      name: 'Counter-Strike 2',
      image: 'https://imgs.search.brave.com/2gU15ARP44QW0Al7wS-mio33PgHzVnAtqkbIAf70IhI/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJjYXZlLmNv/bS93cC93cDIzODYx/MDAuanBn',
      players: '25M',
      category: 'FPS',
      rating: 4.9,
      price: 'Grátis',
      description: 'FPS tático clássico com gráficos modernos e gameplay refinado.'
    },
    {
      id: 'fortnite',
      name: 'Fortnite',
      image: 'https://imgs.search.brave.com/d4Fi7AJ6xz3TAh59U5ldiDoLWE32kf34cjgeXJy5yIc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9hc3Nl/dHMueGJveHNlcnZp/Y2VzLmNvbS9hc3Nl/dHMvMGQvNDcvMGQ0/N2VmNzMtYzI5Ny00/NTNjLWIzYWItMjU0/NTUxNWZhMjA3Lmpw/Zz9uPUZvcnRuaXRl/X0ltYWdlLTEwODRf/RGV0YWlscy1pbnRy/b19FVkdSLVB1cnBs/ZV8xOTIweDUwMC5q/cGc',
      players: '400M',
      category: 'Battle Royale',
      rating: 4.5,
      price: 'Grátis',
      description: 'Battle royale com construção e eventos épicos.'
    },
    {
      id: 'r6',
      name: 'Rainbow Six Siege',
      image: 'https://imgs.search.brave.com/WfnzKMea-d0mPjN6y3yoKyI04Pjx5IiQWs-zB12BVlI/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJjYXZlLmNv/bS93cC93cDE4NDY5/OTUuanBn',
      players: '80M',
      category: 'FPS Tático',
      rating: 4.4,
      price: 'R$ 79,90',
      description: 'FPS tático com operadores únicos e destruição realista.'
    }
  ];

  const handleGameClick = (gameId: string) => {

    navigate(`/marketplace`);
  };

  const handleExploreAll = () => {

    navigate('/marketplace');
  };

  const handleQuickAction = (action: string, gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    switch (action) {
      case 'play':

                break;
      case 'shop':

        navigate(`/marketplace`);
        break;
      case 'info':

                break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Jogos Populares</h2>
        <button 
          onClick={handleExploreAll}
          className="
            flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 
            text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 
            transition-all duration-200 transform hover:scale-105
            focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900
          "
        >
          Ver todos
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="
              group cursor-pointer bg-gray-800 rounded-xl overflow-hidden
              hover:transform hover:scale-[1.02] transition-all duration-300
              hover:shadow-2xl hover:shadow-purple-500/20
              relative
            "
            onMouseEnter={() => setHoveredGame(game.id)}
            onMouseLeave={() => setHoveredGame(null)}
            onClick={() => handleGameClick(game.id)}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={game.image}
                alt={game.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
              
              {}
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                  {game.category}
                </span>
              </div>

              {}
              <div className="absolute bottom-4 left-4">
                <div className="flex items-center gap-1 bg-black bg-opacity-50 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-white text-sm font-medium">{game.rating}</span>
                </div>
              </div>

              {}
              {hoveredGame === game.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-4"
                >
                  <button
                    onClick={(e) => handleQuickAction('play', game.id, e)}
                    className="
                      flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                      hover:bg-green-700 transition-all duration-200 transform hover:scale-105
                    "
                  >
                    <Play className="w-4 h-4" />
                    Jogar
                  </button>
                  <button
                    onClick={(e) => handleQuickAction('shop', game.id, e)}
                    className="
                      flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg
                      hover:bg-purple-700 transition-all duration-200 transform hover:scale-105
                    "
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Comprar
                  </button>
                </motion.div>
              )}
            </div>
            
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors duration-200">
                {game.name}
              </h3>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{game.players}</span>
                </div>
                {game.price && (
                  <span className="text-purple-400 font-medium text-sm">
                    {game.price}
                  </span>
                )}
              </div>

              <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                {game.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(game.rating) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm">({game.rating})</span>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGameClick(game.id);
                  }}
                  className="
                    px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 
                    text-white rounded-lg font-medium text-sm
                    hover:from-purple-700 hover:to-blue-700 
                    transition-all duration-200 transform hover:scale-105
                    focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800
                  "
                >
                  Explorar
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default GamesSection;