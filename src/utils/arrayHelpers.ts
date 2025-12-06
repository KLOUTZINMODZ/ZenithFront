


export function limitArraySize<T>(array: T[], maxSize: number): T[] {
  if (array.length <= maxSize) {
    return array;
  }
  
  
  return array.slice(-maxSize);
}


export function addAndLimit<T>(array: T[], item: T, maxSize: number): T[] {
  const newArray = [...array, item];
  return limitArraySize(newArray, maxSize);
}


export function addManyAndLimit<T>(array: T[], items: T[], maxSize: number): T[] {
  const newArray = [...array, ...items];
  return limitArraySize(newArray, maxSize);
}


export const ARRAY_LIMITS = {
  MESSAGES_PER_CONVERSATION: 200,  
  NOTIFICATIONS: 50,                
  ACHIEVEMENTS: 100,                
  SEARCH_RESULTS: 50,               
  CONVERSATIONS: 100,               
} as const;


export function removeOldItems<T extends Record<string, any>>(
  array: T[],
  maxAgeMs: number,
  timestampKey: keyof T = 'timestamp' as keyof T
): T[] {
  const now = Date.now();
  
  return array.filter(item => {
    const timestamp = item[timestampKey];
    if (!timestamp) return true; 
    
    const itemTime = typeof timestamp === 'string' 
      ? new Date(timestamp).getTime() 
      : timestamp;
    
    return (now - itemTime) < maxAgeMs;
  });
}


export function removeDuplicates<T extends Record<string, any>>(
  array: T[],
  key: keyof T
): T[] {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}
