


export const GAMES = {

  ALBION_ONLINE: 1,
  VALORANT: 2,
  LEAGUE_OF_LEGENDS: 3,
  CS2: 4,
  DOTA2: 5,
  OVERWATCH2: 6,
  APEX_LEGENDS: 7,
  FORTNITE: 8,
  ROCKET_LEAGUE: 9,
  RAINBOW_SIX: 10,
  CALL_OF_DUTY: 11,
  PUBG: 12,
  FREE_FIRE: 13,
  WILD_RIFT: 14,
  TFT: 15,
  LEGENDS_OF_RUNETERRA: 16,
  HEARTHSTONE: 17,
  MINECRAFT: 18,
  GTA_V: 19,
  FIFA: 20,
  LOST_ARK: 21,
  NEW_WORLD: 22,
  WOW: 23,
  DIABLO_IV: 24,
  PATH_OF_EXILE: 25
};


export const GAMES_DATA = {
  [GAMES.ALBION_ONLINE]: {
    id: GAMES.ALBION_ONLINE,
    name: 'Albion Online',
    slug: 'albion-online',
    category: 'MMORPG',
    icon: '⚔️',
    color: '#8B4513',
    ranks: ['Bronze', 'Silver', 'Gold', 'Crystal', 'Elite'],
    modes: ['PvP', 'PvE', 'GvG', 'Hellgate'],
    active: true
  },
  [GAMES.VALORANT]: {
    id: GAMES.VALORANT,
    name: 'Valorant',
    slug: 'valorant',
    category: 'FPS',
    icon: '🎯',
    color: '#FF4655',
    ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'],
    modes: ['Competitive', 'Unrated', 'Spike Rush', 'Deathmatch'],
    active: true
  },
  [GAMES.LEAGUE_OF_LEGENDS]: {
    id: GAMES.LEAGUE_OF_LEGENDS,
    name: 'League of Legends',
    slug: 'league-of-legends',
    category: 'MOBA',
    icon: '⚔️',
    color: '#0596AA',
    ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'],
    modes: ['Ranked Solo/Duo', 'Ranked Flex', 'Normal', 'ARAM'],
    active: true
  },
  [GAMES.CS2]: {
    id: GAMES.CS2,
    name: 'Counter-Strike 2',
    slug: 'cs2',
    category: 'FPS',
    icon: '💣',
    color: '#DE9B35',
    ranks: ['Silver', 'Gold Nova', 'Master Guardian', 'Distinguished Master Guardian', 'Legendary Eagle', 'Supreme Master', 'Global Elite'],
    modes: ['Competitive', 'Premier', 'Casual', 'Deathmatch'],
    active: true
  },
  [GAMES.DOTA2]: {
    id: GAMES.DOTA2,
    name: 'Dota 2',
    slug: 'dota-2',
    category: 'MOBA',
    icon: '🗡️',
    color: '#E62E00',
    ranks: ['Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal'],
    modes: ['Ranked', 'Unranked', 'Turbo', 'Ability Draft'],
    active: true
  },
  [GAMES.OVERWATCH2]: {
    id: GAMES.OVERWATCH2,
    name: 'Overwatch 2',
    slug: 'overwatch-2',
    category: 'FPS',
    icon: '🛡️',
    color: '#F99E1A',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Champion'],
    modes: ['Competitive', 'Quick Play', 'Arcade'],
    active: true
  },
  [GAMES.APEX_LEGENDS]: {
    id: GAMES.APEX_LEGENDS,
    name: 'Apex Legends',
    slug: 'apex-legends',
    category: 'Battle Royale',
    icon: '🏆',
    color: '#DA292A',
    ranks: ['Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Apex Predator'],
    modes: ['Ranked BR', 'Trios', 'Duos', 'Arenas'],
    active: true
  },
  [GAMES.FORTNITE]: {
    id: GAMES.FORTNITE,
    name: 'Fortnite',
    slug: 'fortnite',
    category: 'Battle Royale',
    icon: '🔫',
    color: '#8A2BE2',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Champion', 'Unreal'],
    modes: ['Battle Royale', 'Zero Build', 'Arena', 'Creative'],
    active: true
  },
  [GAMES.ROCKET_LEAGUE]: {
    id: GAMES.ROCKET_LEAGUE,
    name: 'Rocket League',
    slug: 'rocket-league',
    category: 'Sports',
    icon: '⚽',
    color: '#0088FF',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion', 'Grand Champion', 'Supersonic Legend'],
    modes: ['1v1', '2v2', '3v3', 'Hoops', 'Rumble'],
    active: true
  },
  [GAMES.RAINBOW_SIX]: {
    id: GAMES.RAINBOW_SIX,
    name: 'Rainbow Six Siege',
    slug: 'rainbow-six-siege',
    category: 'FPS',
    icon: '🔫',
    color: '#000000',
    ranks: ['Copper', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Champion'],
    modes: ['Ranked', 'Unranked', 'Quick Match', 'Arcade'],
    active: true
  },
  [GAMES.CALL_OF_DUTY]: {
    id: GAMES.CALL_OF_DUTY,
    name: 'Call of Duty',
    slug: 'call-of-duty',
    category: 'FPS',
    icon: '🎖️',
    color: '#006633',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Crimson', 'Iridescent', 'Top 250'],
    modes: ['Ranked Play', 'Multiplayer', 'Warzone', 'DMZ'],
    active: true
  },
  [GAMES.PUBG]: {
    id: GAMES.PUBG,
    name: 'PUBG',
    slug: 'pubg',
    category: 'Battle Royale',
    icon: '🪖',
    color: '#F2A900',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'],
    modes: ['Ranked', 'Normal', 'Arcade', 'Custom'],
    active: true
  },
  [GAMES.FREE_FIRE]: {
    id: GAMES.FREE_FIRE,
    name: 'Free Fire',
    slug: 'free-fire',
    category: 'Battle Royale',
    icon: '🔥',
    color: '#FF6600',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Heroic', 'Grandmaster'],
    modes: ['Ranked', 'Classic', 'Clash Squad'],
    active: true
  },
  [GAMES.WILD_RIFT]: {
    id: GAMES.WILD_RIFT,
    name: 'Wild Rift',
    slug: 'wild-rift',
    category: 'MOBA',
    icon: '📱',
    color: '#0596AA',
    ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'],
    modes: ['Ranked', 'Normal', 'ARAM'],
    active: true
  },
  [GAMES.TFT]: {
    id: GAMES.TFT,
    name: 'Teamfight Tactics',
    slug: 'tft',
    category: 'Auto Chess',
    icon: '♟️',
    color: '#624B7A',
    ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'],
    modes: ['Ranked', 'Normal', 'Hyper Roll', 'Double Up'],
    active: true
  },
  [GAMES.LEGENDS_OF_RUNETERRA]: {
    id: GAMES.LEGENDS_OF_RUNETERRA,
    name: 'Legends of Runeterra',
    slug: 'legends-of-runeterra',
    category: 'Card Game',
    icon: '🃏',
    color: '#C28F2C',
    ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'],
    modes: ['Ranked', 'Normal', 'Expedition', 'Lab'],
    active: true
  },
  [GAMES.HEARTHSTONE]: {
    id: GAMES.HEARTHSTONE,
    name: 'Hearthstone',
    slug: 'hearthstone',
    category: 'Card Game',
    icon: '🎴',
    color: '#F4C430',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend'],
    modes: ['Standard', 'Wild', 'Arena', 'Battlegrounds'],
    active: true
  },
  [GAMES.MINECRAFT]: {
    id: GAMES.MINECRAFT,
    name: 'Minecraft',
    slug: 'minecraft',
    category: 'Sandbox',
    icon: '⛏️',
    color: '#62C25E',
    ranks: [],
    modes: ['Survival', 'Creative', 'Adventure', 'Hardcore'],
    active: true
  },
  [GAMES.GTA_V]: {
    id: GAMES.GTA_V,
    name: 'GTA V',
    slug: 'gta-v',
    category: 'Action',
    icon: '🚗',
    color: '#000000',
    ranks: [],
    modes: ['Online', 'Story Mode', 'Heists', 'Races'],
    active: true
  },
  [GAMES.FIFA]: {
    id: GAMES.FIFA,
    name: 'EA FC',
    slug: 'ea-fc',
    category: 'Sports',
    icon: '⚽',
    color: '#1E5945',
    ranks: ['Division 10', 'Division 9', 'Division 8', 'Division 7', 'Division 6', 'Division 5', 'Division 4', 'Division 3', 'Division 2', 'Division 1', 'Elite'],
    modes: ['FUT Champions', 'Division Rivals', 'Squad Battles', 'Pro Clubs'],
    active: true
  },
  [GAMES.LOST_ARK]: {
    id: GAMES.LOST_ARK,
    name: 'Lost Ark',
    slug: 'lost-ark',
    category: 'MMORPG',
    icon: '⚔️',
    color: '#D4AF37',
    ranks: [],
    modes: ['PvE', 'PvP', 'Raids', 'Dungeons'],
    active: true
  },
  [GAMES.NEW_WORLD]: {
    id: GAMES.NEW_WORLD,
    name: 'New World',
    slug: 'new-world',
    category: 'MMORPG',
    icon: '🏴‍☠️',
    color: '#FF7C00',
    ranks: [],
    modes: ['PvE', 'PvP', 'Wars', 'Expeditions'],
    active: true
  },
  [GAMES.WOW]: {
    id: GAMES.WOW,
    name: 'World of Warcraft',
    slug: 'world-of-warcraft',
    category: 'MMORPG',
    icon: '🐉',
    color: '#F7C12C',
    ranks: [],
    modes: ['PvE', 'PvP', 'Mythic+', 'Raids', 'Arena'],
    active: true
  },
  [GAMES.DIABLO_IV]: {
    id: GAMES.DIABLO_IV,
    name: 'Diablo IV',
    slug: 'diablo-iv',
    category: 'ARPG',
    icon: '😈',
    color: '#8B0000',
    ranks: [],
    modes: ['Campaign', 'Nightmare Dungeons', 'Helltide', 'PvP'],
    active: true
  },
  [GAMES.PATH_OF_EXILE]: {
    id: GAMES.PATH_OF_EXILE,
    name: 'Path of Exile',
    slug: 'path-of-exile',
    category: 'ARPG',
    icon: '💀',
    color: '#AF0A0F',
    ranks: [],
    modes: ['Standard', 'Hardcore', 'League', 'SSF'],
    active: true
  }
};


export function getGameById(gameId) {
  return GAMES_DATA[gameId] || null;
}


export function getGameByName(gameName) {
  if (!gameName) return null;
  
  const normalizedName = gameName.toLowerCase().trim();
  
  for (const gameData of Object.values(GAMES_DATA)) {
    if (gameData.name.toLowerCase() === normalizedName || 
        gameData.slug === normalizedName) {
      return gameData;
    }
  }
  return null;
}


export function getGameIdByName(gameName) {
  const game = getGameByName(gameName);
  return game ? game.id : null;
}


export function getGameNameById(gameId) {
  const game = getGameById(gameId);
  return game ? game.name : null;
}


export function getActiveGames() {
  return Object.values(GAMES_DATA)
    .filter(game => game.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}


export function getGamesByCategory(category) {
  return Object.values(GAMES_DATA)
    .filter(game => game.category === category && game.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}


export function getCategories() {
  const categories = new Set();
  Object.values(GAMES_DATA).forEach(game => {
    if (game.active) {
      categories.add(game.category);
    }
  });
  return Array.from(categories).sort();
}


export function getGameRanks(gameId) {
  const game = getGameById(gameId);
  return game ? game.ranks : [];
}


export function getGameModes(gameId) {
  const game = getGameById(gameId);
  return game ? game.modes : [];
}


export function getGameIcon(gameId) {
  const game = getGameById(gameId);
  return game ? game.icon : '🎮';
}


export function getGameColor(gameId) {
  const game = getGameById(gameId);
  return game ? game.color : '#666666';
}


export function isValidGame(gameIdOrName) {
  if (typeof gameIdOrName === 'number') {
    return !!getGameById(gameIdOrName);
  }
  return !!getGameByName(gameIdOrName);
}


export function gameNamesToIds(gameNames) {
  if (!Array.isArray(gameNames)) return [];
  
  return gameNames
    .map(name => getGameIdByName(name))
    .filter(id => id !== null);
}


export function gameIdsToNames(gameIds) {
  if (!Array.isArray(gameIds)) return [];
  
  return gameIds
    .map(id => getGameNameById(id))
    .filter(name => name !== null);
}
