


import api from './api';

export interface GameData {
  _id: string;
  name: string;
  slug: string;
  coverImage?: string;
  popularity?: number;
  isActive: boolean;
}

interface GameCache {
  games: Map<string, GameData>;
  nameToId: Map<string, string>;
  lastFetch: number;
  ttl: number;
}

class GameCacheService {
  private cache: GameCache = {
    games: new Map(),
    nameToId: new Map(),
    lastFetch: 0,
    ttl: 30 * 60 * 1000
  };

  private fetchPromise: Promise<void> | null = null;

  


  async initialize(force: boolean = false): Promise<void> {
    const now = Date.now();
    

    if (!force && this.cache.lastFetch && (now - this.cache.lastFetch) < this.cache.ttl) {
      return;
    }


    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this.fetchGames();
    await this.fetchPromise;
    this.fetchPromise = null;
  }

  private async fetchGames(): Promise<void> {
    try {
      const response = await api.get<{ success: boolean; data: GameData[] }>('/games');
      
      if (response.data.success && response.data.data) {
        this.cache.games.clear();
        this.cache.nameToId.clear();

        response.data.data.forEach(game => {
          this.cache.games.set(game._id, game);
          this.cache.nameToId.set(game.name.toLowerCase(), game._id);
          

          if (game.slug) {
            this.cache.nameToId.set(game.slug, game._id);
          }
        });

        this.cache.lastFetch = Date.now();


        this.saveToLocalStorage();
      }
    } catch (error) {
      

      this.loadFromLocalStorage();
    }
  }

  


  async getGameById(id: string): Promise<GameData | null> {
    await this.initialize();
    return this.cache.games.get(id) || null;
  }

  


  async getGameByName(name: string): Promise<GameData | null> {
    await this.initialize();
    const id = this.cache.nameToId.get(name.toLowerCase());
    return id ? this.cache.games.get(id) || null : null;
  }

  


  async getIdFromName(name: string): Promise<string | null> {
    await this.initialize();
    return this.cache.nameToId.get(name.toLowerCase()) || null;
  }

  


  async getNameFromId(id: string): Promise<string | null> {
    const game = await this.getGameById(id);
    return game ? game.name : null;
  }

  


  async getAllGames(): Promise<GameData[]> {
    await this.initialize();
    return Array.from(this.cache.games.values());
  }

  


  async namesToIds(names: string[]): Promise<string[]> {
    await this.initialize();
    return names
      .map(name => this.cache.nameToId.get(name.toLowerCase()))
      .filter((id): id is string => id !== undefined);
  }

  


  async idsToNames(ids: string[]): Promise<string[]> {
    await this.initialize();
    return ids
      .map(id => this.cache.games.get(id)?.name)
      .filter((name): name is string => name !== undefined);
  }

  


  async isValidGame(value: string): Promise<boolean> {
    await this.initialize();
    return this.cache.games.has(value) || this.cache.nameToId.has(value.toLowerCase());
  }

  


  async normalizeToId(value: string): Promise<string | null> {
    await this.initialize();
    

    if (this.cache.games.has(value)) {
      return value;
    }
    

    return this.cache.nameToId.get(value.toLowerCase()) || null;
  }

  


  clearCache(): void {
    this.cache.games.clear();
    this.cache.nameToId.clear();
    this.cache.lastFetch = 0;
    localStorage.removeItem('gameCache');
  }

  


  private saveToLocalStorage(): void {
    try {
      const cacheData = {
        games: Array.from(this.cache.games.entries()),
        nameToId: Array.from(this.cache.nameToId.entries()),
        lastFetch: this.cache.lastFetch
      };
      localStorage.setItem('gameCache', JSON.stringify(cacheData));
    } catch (error) {
    }
  }

  


  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('gameCache');
      if (stored) {
        const cacheData = JSON.parse(stored);
        this.cache.games = new Map(cacheData.games);
        this.cache.nameToId = new Map(cacheData.nameToId);
        this.cache.lastFetch = cacheData.lastFetch;
      }
    } catch (error) {
    }
  }

  


  async refresh(): Promise<void> {
    await this.initialize(true);
  }
}


const gameCacheService = new GameCacheService();
export default gameCacheService;
