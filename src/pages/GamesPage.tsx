import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Grid, List } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  image: string;
  players: string;
  category: string;
  description: string;
  rating: number;
  price?: string;
}

const GamesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const games: Game[] = [
    {
      id: 'valorant',
      name: 'Valorant',
      image: 'https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg',
      players: '15.2M',
      category: 'FPS Tático',
      description: 'Jogo de tiro tático 5v5 onde a precisão e estratégia são fundamentais.',
      rating: 4.8,
      price: 'Grátis'
    },
    {
      id: 'lol',
      name: 'League of Legends',
      image: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg',
      players: '180M',
      category: 'MOBA',
      description: 'MOBA competitivo com mais de 150 campeões únicos para dominar.',
      rating: 4.6,
      price: 'Grátis'
    },
    {
      id: 'gta5',
      name: 'GTA V',
      image: 'https://images.pexels.com/photos/1174732/pexels-photo-1174732.jpeg',
      players: '120M',
      category: 'Action',
      description: 'Mundo aberto com história épica e multiplayer expansivo.',
      rating: 4.7,
      price: 'R$ 89,90'
    },
    {
      id: 'cs2',
      name: 'Counter-Strike 2',
      image: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg',
      players: '25M',
      category: 'FPS',
      description: 'FPS tático clássico com gráficos modernos e gameplay refinado.',
      rating: 4.9,
      price: 'Grátis'
    },
    {
      id: 'fortnite',
      name: 'Fortnite',
      image: 'https://images.pexels.com/photos/1666.jpg',
      players: '400M',
      category: 'Battle Royale',
      description: 'Battle royale com construção e eventos épicos.',
      rating: 4.5,
      price: 'Grátis'
    },
    {
      id: 'r6',
      name: 'Rainbow Six Siege',
      image: 'https://images.pexels.com/photos/3846195/pexels-photo-3846195.jpeg',
      players: '80M',
      category: 'FPS Tático',
      description: 'FPS tático com operadores únicos e destruição realista.',
      rating: 4.4,
      price: 'R$ 79,90'
    },
    {
      id: 'minecraft',
      name: 'Minecraft',
      image: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg',
      players: '140M',
      category: 'Sandbox',
      description: 'Jogo de construção e sobrevivência em mundo de blocos.',
      rating: 4.8,
      price: 'R$ 26,95'
    },
    {
      id: 'overwatch2',
      name: 'Overwatch 2',
      image: 'https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg',
      players: '35M',
      category: 'FPS',
      description: 'FPS hero shooter com heróis únicos e habilidades especiais.',
      rating: 4.3,
      price: 'Grátis'
    }
  ];

  const categories = [
    { id: 'all', name: 'Todos' },
    { id: 'fps', name: 'FPS' },
    { id: 'fps tático', name: 'FPS Tático' },
    { id: 'moba', name: 'MOBA' },
    { id: 'action', name: 'Action' },
    { id: 'battle royale', name: 'Battle Royale' },
    { id: 'sandbox', name: 'Sandbox' }
  ];

  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           game.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleGameClick = (gameId: string) => {

    window.location.href = `/marketplace`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Jogos Disponíveis</h1>
          <p className="text-gray-400">
            Explore nossa coleção completa de jogos e encontre o próximo título para jogar
          </p>
        </div>
        
        {}
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {}
      <div className="flex flex-col lg:flex-row gap-4">
        {}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar jogos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {}
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-4 h-4" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="
                group cursor-pointer bg-gray-800 rounded-xl overflow-hidden
                hover:transform hover:scale-[1.02] transition-all duration-300
                hover:shadow-2xl hover:shadow-purple-500/20
              "
              onClick={() => handleGameClick(game.id)}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                    {game.category}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-white text-sm font-medium">{game.rating}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors duration-200">
                  {game.name}
                </h3>
                <p className="text-gray-400 text-sm mb-2">
                  {game.players} jogadores ativos
                </p>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {game.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-purple-400 font-medium">{game.price}</span>
                  <button className="
                    px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 
                    text-white rounded-lg font-medium text-sm
                    hover:from-purple-700 hover:to-blue-700 
                    transition-all duration-200 transform hover:scale-105
                    focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800
                  ">
                    Explorar
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="
                group cursor-pointer bg-gray-800 rounded-xl overflow-hidden
                hover:bg-gray-750 transition-all duration-300
                hover:shadow-2xl hover:shadow-purple-500/20
              "
              onClick={() => handleGameClick(game.id)}
            >
              <div className="flex flex-col lg:flex-row">
                <div className="relative lg:w-64 h-48 lg:h-auto overflow-hidden">
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                      {game.category}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors duration-200">
                        {game.name}
                      </h3>
                      <p className="text-gray-400 text-sm mb-2">
                        {game.players} jogadores ativos
                      </p>
                      <p className="text-gray-300 text-sm mb-4">
                        {game.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">★</span>
                          <span className="text-white text-sm font-medium">{game.rating}</span>
                        </div>
                        <span className="text-purple-400 font-medium">{game.price}</span>
                      </div>
                    </div>
                    
                    <button className="
                      px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 
                      text-white rounded-lg font-medium
                      hover:from-purple-700 hover:to-blue-700 
                      transition-all duration-200 transform hover:scale-105
                      focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800
                    ">
                      Explorar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {}
      {filteredGames.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-bold text-white mb-2">Nenhum jogo encontrado</h3>
          <p className="text-gray-400">
            Tente ajustar os filtros ou termos de busca
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default GamesPage;
