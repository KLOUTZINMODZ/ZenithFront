


export const GlobalArraySafety = {
  


  safeFind: <T>(array: any, predicate: (item: T, index: number, array: T[]) => boolean): T | undefined => {
    try {
      if (!Array.isArray(array)) {
        return undefined;
      }

      let nullCount = 0;
      for (let i = 0; i < array.length; i++) {
        const item = array[i];
        

        if (item == null) {
          nullCount++;
          continue;
        }

        try {
          if (predicate(item as T, i, array)) {
            return item as T;
          }
        } catch (predicateError) {
          continue;
        }
      }


      return undefined;
    } catch (error) {
      return undefined;
    }
  },

  


  safeFilter: <T>(array: any, predicate: (item: T, index: number, array: T[]) => boolean): T[] => {
    try {
      if (!Array.isArray(array)) {
        return [];
      }

      const result: T[] = [];
      let nullCount = 0;

      for (let i = 0; i < array.length; i++) {
        const item = array[i];
        

        if (item == null) {
          nullCount++;
          continue;
        }

        try {
          if (predicate(item as T, i, array)) {
            result.push(item as T);
          }
        } catch (predicateError) {
          continue;
        }
      }


      return result;
    } catch (error) {
      return [];
    }
  },

  


  safeMap: <T, R>(array: any, mapper: (item: T, index: number, array: T[]) => R): R[] => {
    try {
      if (!Array.isArray(array)) {
        return [];
      }

      const result: R[] = [];
      let nullCount = 0;

      for (let i = 0; i < array.length; i++) {
        const item = array[i];
        

        if (item == null) {
          nullCount++;
          continue;
        }

        try {
          const mapped = mapper(item as T, i, array);
          result.push(mapped);
        } catch (mapperError) {
          continue;
        }
      }


      return result;
    } catch (error) {
      return [];
    }
  },

  


  safeForEach: <T>(array: any, callback: (item: T, index: number, array: T[]) => void): void => {
    try {
      if (!Array.isArray(array)) {
        return;
      }

      let nullCount = 0;
      for (let i = 0; i < array.length; i++) {
        const item = array[i];
        

        if (item == null) {
          nullCount++;
          continue;
        }

        try {
          callback(item as T, i, array);
        } catch (callbackError) {
          continue;
        }
      }

    } catch (error) {

    }
  }
};


export const applyGlobalArraySafetyPatches = () => {


  const originalFind = Array.prototype.find;
  const originalFilter = Array.prototype.filter;
  const originalMap = Array.prototype.map;
  const originalForEach = Array.prototype.forEach;


  Array.prototype.find = function<T>(predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined {
    try {
      return GlobalArraySafety.safeFind(this, predicate);
    } catch (error) {
      return undefined;
    }
  };


  Array.prototype.filter = function<T>(predicate: (value: T, index: number, array: T[]) => boolean): T[] {
    try {
      return GlobalArraySafety.safeFilter(this, predicate);
    } catch (error) {
      return [];
    }
  };


  Array.prototype.map = function<T, U>(callbackfn: (value: T, index: number, array: T[]) => U): U[] {
    try {
      return GlobalArraySafety.safeMap(this, callbackfn);
    } catch (error) {
      return [];
    }
  };


  Array.prototype.forEach = function<T>(callbackfn: (value: T, index: number, array: T[]) => void): void {
    try {
      GlobalArraySafety.safeForEach(this, callbackfn);
    } catch (error) {

    }
  };


  return () => {
    Array.prototype.find = originalFind;
    Array.prototype.filter = originalFilter;
    Array.prototype.map = originalMap;
    Array.prototype.forEach = originalForEach;
  };
};
