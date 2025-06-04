/**
 * Utilities for handling API calls with rate limiting
 */

const fs = require('fs');
const path = require('path');
const { delay } = require('./enhanced-utils');

// Cache directory
const CACHE_DIR = path.join(__dirname, '../.cache');

/**
 * Call an API function with exponential backoff for rate limiting
 * @param {Function} fn Function to call
 * @param {Object} options Options for retry behavior
 * @returns {Promise<any>} Result from the function
 */
async function callWithRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 2000,
    maxDelay = 30000,
    retryStatusCodes = [429, 503],
    logPrefix = 'API'
  } = options;
  
  let retries = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const statusCode = error.status || (error.response ? error.response.status : null);
      const isRateLimited = error.message && (
        error.message.includes('429') || 
        error.message.includes('rate limit') || 
        error.message.includes('too many requests')
      );
      
      const shouldRetry = (
        (statusCode && retryStatusCodes.includes(statusCode)) || 
        isRateLimited
      ) && retries < maxRetries;
      
      if (shouldRetry) {
        retries++;
        
        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = Math.min(
          initialDelay * Math.pow(2, retries) * (0.9 + Math.random() * 0.2),
          maxDelay
        );
        
        // Extract retry-after header if available
        let retryAfter = 0;
        if (error.response && error.response.headers && error.response.headers['retry-after']) {
          retryAfter = parseInt(error.response.headers['retry-after'], 10) * 1000;
        }
        
        // Use the larger of exponentialDelay or retryAfter
        const waitTime = Math.max(exponentialDelay, retryAfter);
        
        console.log(`${logPrefix}: Rate limited. Retry ${retries}/${maxRetries} in ${Math.round(waitTime/1000)}s...`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Create cache directory if it doesn't exist
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`Created cache directory: ${CACHE_DIR}`);
  }
}

/**
 * Generate a cache key from URL and parameters
 * @param {string} url URL being requested
 * @param {Object} params Additional parameters
 * @returns {string} Cache key
 */
function generateCacheKey(url, params = {}) {
  const urlPart = url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const paramsPart = Object.keys(params).length 
    ? '_' + Buffer.from(JSON.stringify(params)).toString('base64').replace(/[^a-z0-9]/gi, '')
    : '';
  
  return `${urlPart}${paramsPart}`;
}

/**
 * Check if a cached response exists and is valid
 * @param {string} cacheKey Cache key
 * @param {number} maxAgeMs Maximum age in milliseconds
 * @returns {Object|null} Cached data or null
 */
function getFromCache(cacheKey, maxAgeMs = 3600000) { // Default: 1 hour
  ensureCacheDir();
  
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  if (fs.existsSync(cacheFile)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const cacheAge = Date.now() - cacheData.timestamp;
      
      if (cacheAge < maxAgeMs) {
        console.log(`Cache hit for ${cacheKey} (age: ${Math.round(cacheAge/1000)}s)`);
        return cacheData.data;
      }
      
      console.log(`Cache expired for ${cacheKey} (age: ${Math.round(cacheAge/1000)}s)`);
    } catch (error) {
      console.error(`Error reading cache file ${cacheFile}:`, error);
    }
  }
  
  return null;
}

/**
 * Save response to cache
 * @param {string} cacheKey Cache key
 * @param {Object} data Data to cache
 */
function saveToCache(cacheKey, data) {
  ensureCacheDir();
  
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  const cacheData = {
    timestamp: Date.now(),
    data
  };
  
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    console.log(`Cached data for ${cacheKey}`);
  } catch (error) {
    console.error(`Error writing cache file ${cacheFile}:`, error);
  }
}

/**
 * Make an API call with caching and retry
 * @param {Function} apiFn Function that makes the API call
 * @param {string} url URL being requested (for cache key)
 * @param {Object} params Additional parameters (for cache key)
 * @param {Object} options Options for caching and retry
 * @returns {Promise<any>} API response
 */
async function cachedApiCall(apiFn, url, params = {}, options = {}) {
  const {
    bypassCache = false,
    maxAgeMs = 3600000, // Default: 1 hour
    retryOptions = {}
  } = options;
  
  const cacheKey = generateCacheKey(url, params);
  
  // Try to get from cache first unless bypass is requested
  if (!bypassCache) {
    const cachedData = getFromCache(cacheKey, maxAgeMs);
    if (cachedData) {
      return cachedData;
    }
  }
  
  // If not in cache or bypass requested, make the API call with retry
  const data = await callWithRetry(apiFn, retryOptions);
  
  // Cache the result
  saveToCache(cacheKey, data);
  
  return data;
}

module.exports = {
  callWithRetry,
  cachedApiCall,
  getFromCache,
  saveToCache,
  generateCacheKey
};
