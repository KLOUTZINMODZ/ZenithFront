const CATEGORY_TRANSLATIONS: Record<string, string> = {
  account: 'Conta',
  'account boost': 'Impulso de conta',
  'account boosting': 'Impulso de conta',
  'account leveling': 'Evolução de conta',
  leveling: 'Aumento de nível',
  'level boost': 'Aumento de nível',
  'leveling boost': 'Aumento de nível',
  'leveling services': 'Serviços de evolução',
  'rank boost': 'Impulso de ranque',
  'rank boosting': 'Impulso de ranque',
  'competitive rank boost': 'Impulso de ranque competitivo',
  'duo boost': 'Boost em duo',
  'duo queue': 'Boost em duo',
  'net wins': 'Vitórias líquidas',
  'placement matches': 'Partidas de colocação',
  placement: 'Partidas de colocação',
  training: 'Treinamento',
  coaching: 'Mentoria',
  'aim coaching': 'Treino de mira',
  'badge boost': 'Impulso de insígnias',
  'bot lobbies': 'Partidas com bots',
  'camo unlock': 'Desbloqueio de camuflagens',
  'weapon boost': 'Impulso de armas',
  'weapon leveling': 'Evolução de armas',
  'battle pass': 'Passe de Batalha',
  'warzone wins': 'Vitórias no Warzone',
  'prestige level': 'Nível de prestígio',
  'trophy boost': 'Impulso de troféus',
  'arena boost': 'Impulso de arena',
  'division boost': 'Impulso de divisão',
  progression: 'Progressão',
  'resource gathering': 'Coleta de recursos',
  experience: 'Experiência',
  'crafting skills': 'Habilidades de criação',
  expeditions: 'Expedições',
  'weapon mastery': 'Maestria de armas',
  raids: 'Raides',
  'mythic plus': 'Masmorras Míticas+',
  'mythic+': 'Masmorras Míticas+',
  equipment: 'Equipamentos',
  pvp: 'PvP',
  custom: 'Solicitação personalizada',
  'custom request': 'Solicitação personalizada',
  building: 'Construção',
  reputation: 'Reputação',
  'robux farming': 'Farm de Robux',
  'specific experiences': 'Experiências específicas',
  achievements: 'Conquistas',
  arena: 'Arena',
  'win boost': 'Impulso de vitórias',
  'wins boost': 'Impulso de vitórias',
  'xp boost': 'Impulso de XP',
  'weapon farming': 'Farm de armas'
};

export const translateCategoryLabel = (value?: string | null, fallback = 'Serviço Personalizado') => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;

  const direct = CATEGORY_TRANSLATIONS[normalized];
  if (direct) return direct;

  const normalizedSpaces = normalized.replace(/[-_]/g, ' ');
  return CATEGORY_TRANSLATIONS[normalizedSpaces] || value;
};

export default translateCategoryLabel;
