/**
 * Enhanced utilities for MCP Directory crawler
 * 
 * Extends the base utils.js with additional functions needed for the new schema
 */

const baseUtils = require('./utils');

/**
 * Convert a string to a URL-friendly slug
 * @param {string} text Text to convert to slug
 * @returns {string} URL-friendly slug
 */
function slugify(text) {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/&/g, '-and-')      // Replace & with 'and'
    .replace(/[^\w\-]+/g, '')    // Remove all non-word characters
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

/**
 * Parse install instructions to ensure they follow the required format
 * @param {Object} instructions Raw installation instructions
 * @returns {Object} Properly formatted installation instructions
 */
function parseInstallInstructions(instructions) {
  // Ensure we have an object to work with
  if (!instructions || typeof instructions !== 'object') {
    return { linux: {}, macos: {}, windows: {} };
  }
  
  // Ensure each platform exists
  const result = {
    linux: instructions.linux || {},
    macos: instructions.macos || {},
    windows: instructions.windows || {}
  };
  
  // Ensure each platform has the required fields
  ['linux', 'macos', 'windows'].forEach(platform => {
    if (typeof result[platform] !== 'object') {
      result[platform] = {};
    }
    
    // Ensure each platform has at least these fields
    result[platform] = {
      cli: result[platform].cli || '',
      npm: result[platform].npm || '',
      docker: result[platform].docker || '',
      ...result[platform]
    };
  });
  
  return result;
}

/**
 * Validate that a numeric field is actually a number
 * @param {any} value Value to check and convert
 * @param {number} defaultValue Default value if conversion fails
 * @returns {number} The validated number
 */
function validateNumber(value, defaultValue = 0) {
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  return defaultValue;
}

/**
 * Convert GitHub API URL to regular GitHub URL
 * @param {string} apiUrl GitHub API URL
 * @returns {string} Regular GitHub URL
 */
function githubApiToRegularUrl(apiUrl) {
  if (!apiUrl || !apiUrl.includes('api.github.com')) {
    return apiUrl;
  }
  
  return apiUrl
    .replace('api.github.com/repos', 'github.com')
    .replace('api.github.com', 'github.com');
}

/**
 * Extracts domain from URL
 * @param {string} url URL to extract domain from
 * @returns {string} Domain without protocol
 */
function extractDomain(url) {
  if (!url) return '';
  
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    // If URL parsing fails, try a simple regex
    const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im);
    return match ? match[1] : '';
  }
}

// Export all utilities, including those from the base utils.js
module.exports = {
  ...baseUtils,
  slugify,
  parseInstallInstructions,
  validateNumber,
  githubApiToRegularUrl,
  extractDomain
};
