/**
 * Simple fuzzy search implementation for filtering items
 * Provides basic functionality similar to Fuse.js but without the dependency
 *
 * @param items Array of items to search
 * @param query Search query
 * @param keys Properties of items to search in
 * @returns Filtered array of items matching the query
 */
export function fuzzySearch<T>(items: T[], query: string, keys: (keyof T)[]): T[] {
  const lowerCaseQuery = query.toLowerCase().trim();
  
  if (!lowerCaseQuery) {
    return items;
  }
  
  const queryLetters = lowerCaseQuery.split('');
  
  return items.filter(item => {
    return keys.some(key => {
      const value = String(item[key] || '').toLowerCase();
      
      // Check if all letters in query appear in sequence in the value
      let idx = 0;
      for (const letter of queryLetters) {
        idx = value.indexOf(letter, idx);
        if (idx === -1) {
          return false;
        }
        idx += 1;
      }
      
      return true;
    });
  });
}
