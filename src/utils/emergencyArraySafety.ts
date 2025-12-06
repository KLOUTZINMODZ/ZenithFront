


export const ultraSafeForEach = <T>(array: any, callback: (item: T, index: number) => void): void => {
  try {
    if (!Array.isArray(array)) {
      return;
    }

    array.forEach((item, _index) => {
      try {

        if (item == null || typeof item !== 'object') {
          return;
        }


        if ('_id' in item && typeof item._id === 'string' && item._id.trim().length > 0) {
          callback(item as T, _index);
        } else {
        }
      } catch (itemError) {
      }
    });
  } catch (error) {
  }
};


export const ultraSafeFilter = <T>(array: any, predicate: (item: T) => boolean): T[] => {
  try {
    if (!Array.isArray(array)) {
      return [];
    }

    const result: T[] = [];
    
    array.forEach((item, _index) => {
      try {

        if (item == null || typeof item !== 'object') {
          return;
        }


        if ('_id' in item && typeof item._id === 'string' && item._id.trim().length > 0) {
          if (predicate(item as T)) {
            result.push(item as T);
          }
        } else {
        }
      } catch (itemError) {
      }
    });

    return result;
  } catch (error) {
    return [];
  }
};


export const ultraSafeMap = <T, R>(array: any, mapper: (item: T) => R): R[] => {
  try {
    if (!Array.isArray(array)) {
      return [];
    }

    const result: R[] = [];
    
    array.forEach((item, _index) => {
      try {

        if (item == null || typeof item !== 'object') {
          return;
        }


        if ('_id' in item && typeof item._id === 'string' && item._id.trim().length > 0) {
          const mapped = mapper(item as T);
          result.push(mapped);
        } else {
        }
      } catch (itemError) {
      }
    });

    return result;
  } catch (error) {
    return [];
  }
};


export const validateConversationArray = (conversations: any): any[] => {
  try {

    if (typeof conversations === 'string') {
      return [];
    }


    if (!conversations) {
      return [];
    }

    if (!Array.isArray(conversations)) {
      return [];
    }

    const validConversations: any[] = [];
    
    ultraSafeForEach(conversations, (conversation, _index) => {
      try {

        if (conversation && 
            typeof conversation === 'object' && 
            conversation !== null &&
            '_id' in conversation && 
            conversation._id && 
            typeof conversation._id === 'string' && 
            conversation._id.trim().length > 0) {
          
          validConversations.push(conversation);
        }
      } catch (itemError) {

      }
    });

    return validConversations;
  } catch (error) {
    return [];
  }
};
