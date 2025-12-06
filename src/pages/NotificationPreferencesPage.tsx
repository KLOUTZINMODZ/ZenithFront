import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, Gamepad2, Mail, Search, ArrowLeft, Save } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import notificationService from '../services/notificationService';

interface NotificationPreferences {
  preferences: {
    newProposal: boolean;
    proposalAccepted: boolean;
    newBoosting: boolean;
    boostingCompleted: boolean;
  };
  watchedGames?: string[];
  watchedGameIds?: string[];
  emailNotifications: boolean;
}

const NotificationPreferencesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    preferences: {
      newProposal: true,
      proposalAccepted: true,
      newBoosting: false,
      boostingCompleted: true
    },
    watchedGames: [],
    watchedGameIds: [],
    emailNotifications: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gameSearch, setGameSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
  const prefersReducedMotion = useReducedMotion();


  const MAX_SELECTED_GAMES = 4;


  const popularGames = [
    { id: 1, name: 'Albion Online', category: 'MMORPG' },
    { id: 2, name: 'Valorant', category: 'FPS' },
    { id: 3, name: 'League of Legends', category: 'MOBA' },
    { id: 4, name: 'Counter-Strike 2', category: 'FPS' },
    { id: 5, name: 'Dota 2', category: 'MOBA' },
    { id: 6, name: 'Overwatch 2', category: 'FPS' },
    { id: 7, name: 'Apex Legends', category: 'Battle Royale' },
    { id: 8, name: 'Fortnite', category: 'Battle Royale' },
    { id: 9, name: 'Rocket League', category: 'Sports' },
    { id: 10, name: 'Rainbow Six Siege', category: 'FPS' },
    { id: 11, name: 'Call of Duty', category: 'FPS' },
    { id: 12, name: 'PUBG', category: 'Battle Royale' },
    { id: 13, name: 'Free Fire', category: 'Mobile Battle Royale' },
    { id: 14, name: 'Wild Rift', category: 'Mobile MOBA' },
    { id: 15, name: 'Teamfight Tactics', category: 'Auto Battler' },
    { id: 16, name: 'Legends of Runeterra', category: 'Card Game' },
    { id: 17, name: 'Hearthstone', category: 'Card Game' },
    { id: 18, name: 'Minecraft', category: 'Sandbox' },
    { id: 19, name: 'Grand Theft Auto V', category: 'Action' },
    { id: 20, name: 'FIFA', category: 'Sports' },
    { id: 21, name: 'Lost Ark', category: 'MMORPG' },
    { id: 22, name: 'New World', category: 'MMORPG' },
    { id: 23, name: 'World of Warcraft', category: 'MMORPG' },
    { id: 24, name: 'Diablo IV', category: 'ARPG' },
    { id: 25, name: 'Path of Exile', category: 'ARPG' }
  ];


  const fetchPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await notificationService.getPreferences();
      if (response.success && response.data) {
        setPreferences(response.data);
        
        // CRITICAL: Salvar preferências no localStorage para que o WebSocket use
        try {
          localStorage.setItem('notification_preferences', JSON.stringify(response.data));
        } catch (e) {
          // Silenciar erro
        }

        if (response.data.watchedGameIds) {

          const numericIds = response.data.watchedGameIds.map((id: any) => 
            typeof id === 'string' ? parseInt(id, 10) : id
          ).filter((id: number) => !isNaN(id));
          setSelectedGameIds(numericIds);
        } else if (response.data.watchedGames) {

          const gameIds = response.data.watchedGames.map((name: string) => {
            const game = popularGames.find(g => g.name === name);
            return game?.id;
          }).filter((id: number | undefined): id is number => id !== undefined);
          setSelectedGameIds(gameIds);
        }
      }
    } catch (error) {
            addNotification({
        title: 'Erro',
        message: 'Não foi possível carregar as preferências',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };


  const savePreferences = async () => {
    setSaving(true);
    try {

      const updatedPreferences = {
        ...preferences,
        watchedGameIds: selectedGameIds
      };
      const response = await notificationService.updatePreferences(updatedPreferences);
      if (response.success) {
        // CRITICAL: Salvar preferências no localStorage para que o WebSocket use
        try {
          localStorage.setItem('notification_preferences', JSON.stringify(updatedPreferences));
        } catch (e) {
          // Silenciar erro
        }

        addNotification({
          title: 'Sucesso',
          message: 'Preferências salvas com sucesso',
          type: 'success'
        });
      } else {
        throw new Error(response.message || 'Erro ao salvar preferências');
      }
    } catch (error: any) {
            addNotification({
        title: 'Erro',
        message: error.message || 'Não foi possível salvar as preferências',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };


  const updatePreference = (key: keyof NotificationPreferences['preferences'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };


  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(gameSearch.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [gameSearch]);


  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPreferences();

  }, [user, navigate]);


  const filteredGames = useMemo(() => {
    return popularGames.filter(game => 
      game.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [debouncedSearch]);


  

  const addWatchedGame = (gameId: number) => {
    if (selectedGameIds.includes(gameId) || selectedGameIds.length >= MAX_SELECTED_GAMES) return;
    
    setSelectedGameIds(prev => [...prev, gameId]);
  };

  const removeWatchedGame = (gameId: number) => {
    setSelectedGameIds(prev => prev.filter(id => id !== gameId));
  };

  const toggleWatchedGame = (gameId: number) => {
    if (selectedGameIds.includes(gameId)) {
      removeWatchedGame(gameId);
    } else if (selectedGameIds.length < MAX_SELECTED_GAMES) {
      addWatchedGame(gameId);
    }
  };


  if (!user) return null;

  return (
    <div className="bg-gradient-to-br via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
            <motion.button
              onClick={() => navigate('/browse-boostings')}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Preferências de Notificação
              </h1>
              <p className="text-gray-400 mt-1">
                Configure quando e como você deseja receber notificações
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-6 h-6 text-purple-400" />
                <h2 className="text-lg sm:text-xl font-semibold">Tipos de Notificação</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">Nova Proposta</h3>
                    <p className="text-sm text-gray-400">
                      Receber notificação quando alguém enviar uma proposta para seus boostings
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-auto">
                    <input
                      type="checkbox"
                      checked={preferences.preferences.newProposal}
                      onChange={(e) => updatePreference('newProposal', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">Proposta Aceita</h3>
                    <p className="text-sm text-gray-400">
                      Receber notificação quando uma de suas propostas for aceita
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-auto">
                    <input
                      type="checkbox"
                      checked={preferences.preferences.proposalAccepted}
                      onChange={(e) => updatePreference('proposalAccepted', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">Novo Boosting</h3>
                    <p className="text-sm text-gray-400">
                      Receber notificação quando um novo boosting for postado nos jogos que você acompanha
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-auto">
                    <input
                      type="checkbox"
                      checked={preferences.preferences.newBoosting}
                      onChange={(e) => updatePreference('newBoosting', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">Boosting Concluído</h3>
                    <p className="text-sm text-gray-400">
                      Receber notificação quando um boosting for concluído
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-auto">
                    <input
                      type="checkbox"
                      checked={preferences.preferences.boostingCompleted}
                      onChange={(e) => updatePreference('boostingCompleted', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </motion.div>

            {}
            <motion.div
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Gamepad2 className="w-6 h-6 text-purple-400" />
                  <h2 className="text-lg sm:text-xl font-semibold">Jogos Acompanhados</h2>
                </div>
                <div className="text-sm text-gray-400">
                  {selectedGameIds.length}/{MAX_SELECTED_GAMES} selecionados
                </div>
              </div>
              
              <p className="text-gray-400 mb-6">
                Receba notificações quando novos boostings forem postados para estes jogos (máximo {MAX_SELECTED_GAMES})
              </p>

              {}
              {selectedGameIds.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Jogos Selecionados:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedGameIds.map((gameId, index) => {
                      const game = popularGames.find(g => g.id === gameId);
                      return (
                        <motion.div
                          key={gameId}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 22, delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 bg-purple-600/10 border border-purple-500/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Gamepad2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <div>
                              <span className="text-white font-medium">{game?.name || gameId}</span>
                              {game?.category && (
                                <span className="block text-xs text-gray-400">{game.category}</span>
                              )}
                            </div>
                          </div>
                          <motion.button
                            onClick={() => removeWatchedGame(gameId)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={gameSearch}
                    onChange={(e) => setGameSearch(e.target.value)}
                    placeholder="Buscar jogos para adicionar..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              {}
              <div className="space-y-3">
                {selectedGameIds.length >= MAX_SELECTED_GAMES && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-300 text-sm">
                      Você atingiu o limite máximo de {MAX_SELECTED_GAMES} jogos. Remova um jogo para adicionar outro.
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                  {filteredGames.slice(0, 50).map((game) => {
                    const isSelected = selectedGameIds.includes(game.id);
                    const canSelect = !isSelected && selectedGameIds.length < MAX_SELECTED_GAMES;
                    
                    return (
                      <motion.button
                        key={game.id}
                        type="button"
                        onClick={() => toggleWatchedGame(game.id)}
                        disabled={!isSelected && selectedGameIds.length >= MAX_SELECTED_GAMES}
                        className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                          isSelected
                            ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-lg'
                            : canSelect
                            ? 'bg-gray-700/50 border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500'
                            : 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                        }`}
                        whileHover={canSelect || isSelected ? { scale: 1.02 } : {}}
                        whileTap={canSelect || isSelected ? { scale: 0.98 } : {}}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-500'
                          }`}>
                            {isSelected && <Check className="w-2 h-2 text-white" />}
                          </div>
                          <span className="font-medium text-sm truncate">{game.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{game.category}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {filteredGames.length === 0 && gameSearch && (
                  <div className="text-center py-8 text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum jogo encontrado para "{gameSearch}"</p>
                  </div>
                )}
              </div>

              {selectedGameIds.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-t border-gray-700 mt-6">
                  <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Nenhum jogo selecionado</p>
                  <p className="text-sm">Selecione até {MAX_SELECTED_GAMES} jogos para receber notificações sobre novos boostings</p>
                </div>
              )}
            </motion.div>

            {}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-6 h-6 text-purple-400" />
                <h2 className="text-lg sm:text-xl font-semibold">Notificações por Email</h2>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-gray-700/30 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium">Receber emails</h3>
                  <p className="text-sm text-gray-400">
                    Receber notificações importantes por email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 self-start sm:self-auto">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => setPreferences(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </motion.div>

            {}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex justify-center sm:justify-end"
            >
              <motion.button
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto justify-center"
                whileHover={{ scale: saving ? 1 : 1.05 }}
                whileTap={{ scale: saving ? 1 : 0.95 }}
              >
                <Save className={`w-5 h-5 mr-2 ${saving ? 'animate-pulse' : ''}`} />
                {saving ? 'Salvando...' : 'Salvar Preferências'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
