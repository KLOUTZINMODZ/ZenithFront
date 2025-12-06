


export const ensureArray = <T>(value: any): T[] => {
  if (Array.isArray(value)) {

    return value.filter(item => {

      if (item == null || typeof item !== 'object') {
        return false;
      }
      

      if (Object.keys(item).length === 0) {
        return false;
      }
      

      if (item._id) {
      }
      
      return true;
    });
  }
  
  return [];
};


export const safeForEach = <T>(
  array: any, 
  callback: (item: T, index: number, array: T[]) => void
): void => {
  const safeArray = ensureArray<T>(array);
  safeArray.forEach(callback);
};


export const safeFilter = <T>(
  array: any,
  predicate: (item: T, index: number, array: T[]) => boolean
): T[] => {
  const safeArray = ensureArray<T>(array);
  return safeArray.filter(predicate);
};


export const safeMap = <T, U>(
  array: any,
  callback: (item: T, index: number, array: T[]) => U
): U[] => {
  const safeArray = ensureArray<T>(array);
  return safeArray.map(callback);
};


export const safeFind = <T>(
  array: any,
  predicate: (item: T, index: number, array: T[]) => boolean
): T | undefined => {
  const safeArray = ensureArray<T>(array);
  return safeArray.find(predicate);
};


export const isValidArray = (value: any): boolean => {
  return Array.isArray(value) && value.length > 0;
};


export const safeLength = (array: any): number => {
  return Array.isArray(array) ? array.length : 0;
};


export const isValidConversation = (conv: any): boolean => {
  return conv &&
         typeof conv === 'object' &&
         '_id' in conv &&
         conv._id && 
         typeof conv._id === 'string' &&
         conv._id.trim().length > 0;
};


export const isValidMessage = (msg: any): boolean => {
  return msg && 
         typeof msg === 'object' && 
         msg._id && 
         typeof msg._id === 'string' &&
         msg._id.trim().length > 0;
};


export const ensureValidConversations = (conversations: any): any[] => {
  const safeArray = ensureArray(conversations);
  return safeArray.filter(isValidConversation);
};


export const ensureValidMessages = (messages: any): any[] => {
  const safeArray = ensureArray(messages);
  return safeArray.filter(isValidMessage);
};


export const safeApiArray = <T>(apiResponse: any, arrayPath?: string): T[] => {
  try {
    let data = apiResponse;
    

    if (arrayPath) {
      const paths = arrayPath.split('.');
      for (const path of paths) {
        data = data?.[path];
      }
    }
    
    return ensureArray<T>(data);
  } catch (error) {
    return [];
  }
};
