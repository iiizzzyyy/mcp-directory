/**
 * Utility to safely check if code is running on client side
 */
export const isClient = typeof window !== 'undefined';

/**
 * Safe window access for use in components
 * Returns undefined if called on server
 */
export const getWindow = () => {
  return isClient ? window : undefined;
};

/**
 * Safe document access for use in components
 * Returns undefined if called on server
 */
export const getDocument = () => {
  return isClient ? document : undefined;
};

/**
 * Safely access localStorage (client-side only)
 */
export const getLocalStorage = () => {
  return isClient ? window.localStorage : null;
};

/**
 * Only executes callback if running on client
 * @param callback Function to run on client
 */
export const runOnClient = (callback: () => void) => {
  if (isClient) {
    callback();
  }
};
