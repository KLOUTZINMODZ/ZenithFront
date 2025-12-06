


export interface BoostingCategory {
  id: string;
  name: string;
  requiresRanking: boolean;
  isDefault?: boolean;
}

export interface GameBoostingConfig {
  gameId: number;
  gameName: string;
  categories: BoostingCategory[];
}

export const BOOSTING_CATEGORIES_CONFIG: GameBoostingConfig[] = [

  {
    gameId: 7,
    gameName: 'Apex Legends',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'badge-boost', name: 'Impulsionamento de insignia', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 3,
    gameName: 'League of Legends',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'placement', name: 'Impulsionamento de classificação', requiresRanking: true },
      { id: 'net-wins', name: 'Vitórias líquidas', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 2,
    gameName: 'Valorant',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'placement', name: 'Posicionamento', requiresRanking: true },
      { id: 'net-wins', name: 'Vitórias líquidas', requiresRanking: false },
      { id: 'training', name: 'Treinamento', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 4,
    gameName: 'Counter-Strike 2',
    categories: [
      { id: 'premier-boost', name: 'Impulsionamento Premier', requiresRanking: true, isDefault: true },
      { id: 'competitive-boost', name: 'Competitive Rank Boost', requiresRanking: true },
      { id: 'placement', name: 'Partidas de classificação', requiresRanking: true },
      { id: 'arsenal-boost', name: 'Impulsionamento do Arsenal', requiresRanking: false },
      { id: 'faceit-elo', name: 'Impulsionamento Faceit Elo', requiresRanking: true },
      { id: 'wingman-boost', name: 'Impulsionamento de Wingman', requiresRanking: true },
      { id: 'profile-rank', name: 'Impulsionamento de ranque de perfil', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 5,
    gameName: 'Dota 2',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'placement', name: 'Partidas de classificação', requiresRanking: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 6,
    gameName: 'Overwatch 2',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'placement', name: 'Partidas de classificação', requiresRanking: true },
      { id: 'net-wins', name: 'Impulso de vitórias líquidas', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 8,
    gameName: 'Fortnite',
    categories: [
      { id: 'br-rank', name: 'Aumento de classificação no Battle Royale', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 9,
    gameName: 'Rocket League',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'placement', name: 'Partidas de classificação', requiresRanking: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 10,
    gameName: 'Rainbow Six Siege',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'net-wins', name: 'Vitórias líquidas', requiresRanking: false },
      { id: 'credibility', name: 'Credibilidade', requiresRanking: false },
      { id: 'level-boost', name: 'Impulso de Nível', requiresRanking: false },
      { id: 'battle-pass', name: 'Passe de Batalha', requiresRanking: false },
      { id: 'badge-boost', name: 'Impulso de Insígnias', requiresRanking: false },
      { id: 'training', name: 'Treinamento', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 11,
    gameName: 'Call of Duty',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'bot-lobbies', name: 'Bot Lobbies', requiresRanking: false },
      { id: 'camo-unlock', name: 'Desbloquear camuflagens', requiresRanking: false },
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false },
      { id: 'warzone-wins', name: 'Vitória no Warzone', requiresRanking: false },
      { id: 'prestige-level', name: 'Up de Nível de Prestígio', requiresRanking: false },
      { id: 'zombies-bo6', name: 'Mistério de Zumbis BO6', requiresRanking: false },
      { id: 'weapon-boost', name: 'Aprimoramento de Armas', requiresRanking: false },
      { id: 'kd-boost', name: 'Impulso de KD', requiresRanking: false },
      { id: 'battle-pass', name: 'Passe de Batalha', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 12,
    gameName: 'PUBG',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'net-wins', name: 'Vitórias líquidas', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 13,
    gameName: 'Garena Free Fire',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 14,
    gameName: 'League of Legends: Wild Rift',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'legendary-queue', name: 'Fila lendária', requiresRanking: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 22,
    gameName: 'New World',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'experience', name: 'Experiência', requiresRanking: false },
      { id: 'crafting-skills', name: 'Habilidades de criação', requiresRanking: false },
      { id: 'expeditions', name: 'Expedições', requiresRanking: false },
      { id: 'weapon-mastery', name: 'Maestria de armas', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 23,
    gameName: 'World of Warcraft',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'raids', name: 'Raides', requiresRanking: false },
      { id: 'mythic-plus', name: 'Impulso para Masmorras Míticas+', requiresRanking: false },
      { id: 'equipment', name: 'Equipamento', requiresRanking: false },
      { id: 'pvp', name: 'PvP', requiresRanking: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 24,
    gameName: 'Diablo 4',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'lilith-altars', name: 'Altares de Lilith', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 25,
    gameName: 'Path of Exile',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'challenges', name: 'Desafios', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 1,
    gameName: 'Albion Online',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'resource-gathering', name: 'Coleta de recursos', requiresRanking: false },
      { id: 'pvp', name: 'PvP', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  

  {
    gameId: 26,
    gameName: 'Black Desert Online',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 27,
    gameName: 'Call of Duty Mobile',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 28,
    gameName: 'Clash of Clans',
    categories: [
      { id: 'trophy-boost', name: 'Impulso de troféus', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 29,
    gameName: 'Clash Royale',
    categories: [
      { id: 'trophy-boost', name: 'Impulso de troféus', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 30,
    gameName: 'Diablo Immortal',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 31,
    gameName: 'EA Sports FC',
    categories: [
      { id: 'division-boost', name: 'Impulso de divisão', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 32,
    gameName: 'eFootball',
    categories: [
      { id: 'online-matches', name: 'Partidas online', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 33,
    gameName: 'Elden Ring',
    categories: [
      { id: 'progression', name: 'Progressão', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 34,
    gameName: 'Escape from Tarkov',
    categories: [
      { id: 'level-boost', name: 'Impulso de nível', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 35,
    gameName: 'Fallout 76',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 36,
    gameName: 'Final Fantasy XIV',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 37,
    gameName: 'Genshin Impact',
    categories: [
      { id: 'adventure-rank', name: 'Nível de aventura', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 38,
    gameName: 'Grand Theft Auto 5',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 39,
    gameName: 'Honkai Impact 3rd',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 40,
    gameName: 'Honkai: Star Rail',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 41,
    gameName: 'Lost Ark',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 42,
    gameName: 'Minecraft',
    categories: [
      { id: 'building', name: 'Construção', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 43,
    gameName: 'Mobile Legends',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 44,
    gameName: 'Monster Hunter Now',
    categories: [
      { id: 'progression', name: 'Progressão', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 45,
    gameName: 'Old School RuneScape',
    categories: [
      { id: 'leveling', name: 'Upar níveis', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 46,
    gameName: 'PUBG Mobile',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 48,
    gameName: 'Raid: Shadow Legends',
    categories: [
      { id: 'arena-boost', name: 'Impulso de arena', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 49,
    gameName: 'Roblox',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'robux-farming', name: 'Robux farming', requiresRanking: false },
      { id: 'specific-experiences', name: 'Experiências específicas', requiresRanking: false },
      { id: 'achievements', name: 'Conquistas', requiresRanking: false },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 50,
    gameName: 'Rust',
    categories: [
      { id: 'progression', name: 'Progressão', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 51,
    gameName: 'Sea of Thieves',
    categories: [
      { id: 'reputation', name: 'Reputação', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 52,
    gameName: 'The Finals',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 53,
    gameName: 'Tower of Fantasy',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 54,
    gameName: 'Warframe',
    categories: [
      { id: 'mastery-rank', name: 'Ranque de maestria', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 55,
    gameName: 'WoW Classic',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 56,
    gameName: 'Wuthering Waves',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 57,
    gameName: 'Yu-Gi-Oh! Master Duel',
    categories: [
      { id: 'rank-boost', name: 'Impulso de ranque', requiresRanking: true, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  },


  {
    gameId: 58,
    gameName: 'Zenless Zone Zero',
    categories: [
      { id: 'level-boost', name: 'Aumento de nível', requiresRanking: false, isDefault: true },
      { id: 'custom', name: 'Solicitação personalizada', requiresRanking: false }
    ]
  }
];


export const getGameBoostingConfig = (gameId: number): GameBoostingConfig | null => {
  return BOOSTING_CATEGORIES_CONFIG.find(config => config.gameId === gameId) || null;
};


export const getGameBoostingConfigByName = (gameName: string): GameBoostingConfig | null => {
  return BOOSTING_CATEGORIES_CONFIG.find(config => config.gameName === gameName) || null;
};


export const getDefaultCategory = (gameId: number): BoostingCategory | null => {
  const config = getGameBoostingConfig(gameId);
  if (!config) return null;
  
  return config.categories.find(cat => cat.isDefault) || config.categories[0] || null;
};


export const categoryRequiresRanking = (gameId: number, categoryId: string): boolean => {
  const config = getGameBoostingConfig(gameId);
  if (!config) return true;
  
  const category = config.categories.find(cat => cat.id === categoryId);
  return category ? category.requiresRanking : true;
};


export const getGameCategories = (gameId: number): BoostingCategory[] => {
  const config = getGameBoostingConfig(gameId);
  return config ? config.categories : [];
};


export const GAME_NAME_TO_ID: { [key: string]: number } = {
  'Albion Online': 1,
  'Valorant': 2,
  'League of Legends': 3,
  'Counter-Strike 2': 4,
  'Dota 2': 5,
  'Overwatch 2': 6,
  'Apex Legends': 7,
  'Fortnite': 8,
  'Rocket League': 9,
  'Rainbow Six Siege': 10,
  'Call of Duty': 11,
  'PUBG': 12,
  'Garena Free Fire': 13,
  'League of Legends: Wild Rift': 14,
  'New World': 22,
  'World of Warcraft': 23,
  'Diablo 4': 24,
  'Path of Exile': 25,
  'Black Desert Online': 26,
  'Call of Duty Mobile': 27,
  'Clash of Clans': 28,
  'Clash Royale': 29,
  'Diablo Immortal': 30,
  'EA Sports FC': 31,
  'eFootball': 32,
  'Elden Ring': 33,
  'Escape from Tarkov': 34,
  'Fallout 76': 35,
  'Final Fantasy XIV': 36,
  'Genshin Impact': 37,
  'Grand Theft Auto 5': 38,
  'Honkai Impact 3rd': 39,
  'Honkai: Star Rail': 40,
  'Lost Ark': 41,
  'Minecraft': 42,
  'Mobile Legends': 43,
  'Monster Hunter Now': 44,
  'Old School RuneScape': 45,
  'PUBG Mobile': 46,
  'Raid: Shadow Legends': 48,
  'Roblox': 49,
  'Rust': 50,
  'Sea of Thieves': 51,
  'The Finals': 52,
  'Tower of Fantasy': 53,
  'Warframe': 54,
  'WoW Classic': 55,
  'Wuthering Waves': 56,
  'Yu-Gi-Oh! Master Duel': 57,
  'Zenless Zone Zero': 58
};
