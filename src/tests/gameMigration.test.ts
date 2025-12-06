


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameCacheService } from '../services/gameCacheService';
import { boostingService } from '../services/boostingService';
import { notificationService } from '../services/notificationService';


const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

global.localStorage = localStorageMock as any;


global.fetch = vi.fn();


const mockGames = [
  { _id: '507f1f77bcf86cd799439011', name: 'League of Legends' },
  { _id: '507f1f77bcf86cd799439012', name: 'Valorant' },
  { _id: '507f1f77bcf86cd799439013', name: 'CS:GO' },
  { _id: '507f1f77bcf86cd799439014', name: 'Dota 2' }
];

describe('GameCacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameCacheService['gameList'] = [];
    gameCacheService['gameNameToId'] = new Map();
    gameCacheService['gameIdToName'] = new Map();
  });

  describe('Cache Management', () => {
    it('should initialize cache from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        games: mockGames,
        timestamp: Date.now()
      }));

      await gameCacheService.initialize();

      expect(gameCacheService.getGameList()).toHaveLength(4);
      expect(gameCacheService.getGameIdByName('League of Legends')).toBe('507f1f77bcf86cd799439011');
    });

    it('should fetch games from API if cache is stale', async () => {
      const staleTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        games: [],
        timestamp: staleTimestamp
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockGames })
      });

      await gameCacheService.initialize();

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/games'));
      expect(gameCacheService.getGameList()).toEqual(mockGames);
    });

    it('should save cache to localStorage', async () => {
      gameCacheService['gameList'] = mockGames;
      gameCacheService['buildMaps']();
      gameCacheService['saveToLocalStorage']();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gameCache',
        expect.stringContaining('League of Legends')
      );
    });
  });

  describe('ID/Name Mapping', () => {
    beforeEach(() => {
      gameCacheService['gameList'] = mockGames;
      gameCacheService['buildMaps']();
    });

    it('should get game ID by name', () => {
      expect(gameCacheService.getGameIdByName('League of Legends')).toBe('507f1f77bcf86cd799439011');
      expect(gameCacheService.getGameIdByName('Valorant')).toBe('507f1f77bcf86cd799439012');
    });

    it('should get game name by ID', () => {
      expect(gameCacheService.getGameNameById('507f1f77bcf86cd799439011')).toBe('League of Legends');
      expect(gameCacheService.getGameNameById('507f1f77bcf86cd799439012')).toBe('Valorant');
    });

    it('should handle case-insensitive name lookup', () => {
      expect(gameCacheService.getGameIdByName('league of legends')).toBe('507f1f77bcf86cd799439011');
      expect(gameCacheService.getGameIdByName('VALORANT')).toBe('507f1f77bcf86cd799439012');
    });

    it('should return null for non-existent games', () => {
      expect(gameCacheService.getGameIdByName('Non-existent Game')).toBeNull();
      expect(gameCacheService.getGameNameById('invalid-id')).toBeNull();
    });
  });

  describe('Normalization', () => {
    beforeEach(() => {
      gameCacheService['gameList'] = mockGames;
      gameCacheService['buildMaps']();
    });

    it('should normalize game name to ID', () => {
      expect(gameCacheService.normalizeGameInput('League of Legends')).toBe('507f1f77bcf86cd799439011');
      expect(gameCacheService.normalizeGameInput('VALORANT')).toBe('507f1f77bcf86cd799439012');
    });

    it('should return ID unchanged if already an ID', () => {
      expect(gameCacheService.normalizeGameInput('507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011');
    });

    it('should detect ObjectId format', () => {
      expect(gameCacheService.isGameId('507f1f77bcf86cd799439011')).toBe(true);
      expect(gameCacheService.isGameId('League of Legends')).toBe(false);
      expect(gameCacheService.isGameId('invalid-id')).toBe(false);
    });

    it('should normalize array of game inputs', () => {
      const inputs = ['League of Legends', '507f1f77bcf86cd799439012', 'CS:GO'];
      const normalized = gameCacheService.normalizeGameArray(inputs);
      
      expect(normalized).toEqual([
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013'
      ]);
    });
  });
});

describe('BoostingService Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameCacheService['gameList'] = mockGames;
    gameCacheService['buildMaps']();
  });

  it('should send gameId when creating boosting request', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { _id: 'request-id' } })
    });

    await boostingService.createBoostingRequest({
      game: 'League of Legends',
      gameMode: 'Ranked',
      currentRank: 'Gold',
      desiredRank: 'Platinum',
      price: 100
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"gameId":"507f1f77bcf86cd799439011"')
      })
    );
  });

  it('should handle already normalized game IDs', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { _id: 'request-id' } })
    });

    await boostingService.createBoostingRequest({
      game: '507f1f77bcf86cd799439011',
      gameMode: 'Ranked',
      currentRank: 'Gold',
      desiredRank: 'Platinum',
      price: 100
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"gameId":"507f1f77bcf86cd799439011"')
      })
    );
  });

  it('should include both game and gameId for backward compatibility', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { _id: 'request-id' } })
    });

    await boostingService.createBoostingRequest({
      game: 'League of Legends',
      gameMode: 'Ranked',
      currentRank: 'Gold',
      desiredRank: 'Platinum',
      price: 100
    });

    const callArgs = (fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    
    expect(body).toHaveProperty('game', 'League of Legends');
    expect(body).toHaveProperty('gameId', '507f1f77bcf86cd799439011');
  });
});

describe('NotificationService Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameCacheService['gameList'] = mockGames;
    gameCacheService['buildMaps']();
  });

  it('should convert watchedGames to watchedGameIds', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await notificationService.updatePreferences({
      watchedGames: ['League of Legends', 'Valorant'],
      emailNotifications: true,
      pushNotifications: false
    });

    const callArgs = (fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    
    expect(body.watchedGameIds).toEqual([
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012'
    ]);
  });

  it('should preserve watchedGameIds if already present', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await notificationService.updatePreferences({
      watchedGameIds: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
      emailNotifications: true,
      pushNotifications: false
    });

    const callArgs = (fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    
    expect(body.watchedGameIds).toEqual([
      '507f1f77bcf86cd799439013',
      '507f1f77bcf86cd799439014'
    ]);
  });

  it('should prioritize watchedGameIds over watchedGames', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await notificationService.updatePreferences({
      watchedGames: ['League of Legends'],
      watchedGameIds: ['507f1f77bcf86cd799439012'],
      emailNotifications: true
    });

    const callArgs = (fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    
    expect(body.watchedGameIds).toEqual(['507f1f77bcf86cd799439012']);
  });

  it('should handle mixed valid and invalid game names', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await notificationService.updatePreferences({
      watchedGames: ['League of Legends', 'Invalid Game', 'Valorant'],
      emailNotifications: true
    });

    const callArgs = (fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    

    expect(body.watchedGameIds).toEqual([
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012'
    ]);
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameCacheService['gameList'] = mockGames;
    gameCacheService['buildMaps']();
  });

  it('should handle full migration flow for boosting', async () => {

    const legacyRequest = {
      game: 'League of Legends',
      gameMode: 'Ranked',
      currentRank: 'Gold',
      desiredRank: 'Platinum',
      price: 100
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        data: { 
          _id: 'request-id',
          gameId: '507f1f77bcf86cd799439011',
          game: 'League of Legends'
        }
      })
    });

    const result = await boostingService.createBoostingRequest(legacyRequest);
    
    expect(result.data.gameId).toBe('507f1f77bcf86cd799439011');
  });

  it('should handle full migration flow for notifications', async () => {

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        data: {
          watchedGames: ['League of Legends', 'Valorant'],
          emailNotifications: true
        }
      })
    });

    const preferences = await notificationService.getPreferences();
    

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await notificationService.updatePreferences({
      ...preferences.data,
      watchedGameIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
    });

    const callArgs = (fetch as any).mock.calls[1];
    const body = JSON.parse(callArgs[1].body);
    
    expect(body.watchedGameIds).toHaveLength(2);
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle cache initialization failure gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
    
    await gameCacheService.initialize();
    

    expect(gameCacheService.getGameList()).toEqual([]);
  });

  it('should handle invalid game ID format', () => {
    expect(gameCacheService.isGameId('invalid-format')).toBe(false);
    expect(gameCacheService.normalizeGameInput('invalid-format')).toBe('invalid-format');
  });

  it('should handle localStorage errors', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockGames })
    });

    await gameCacheService.initialize();
    

    expect(fetch).toHaveBeenCalled();
  });
});
