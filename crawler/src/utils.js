/**
 * Normalize GitHub URL to a consistent format
 * @param {string} url GitHub URL to normalize
 * @returns {string|undefined} Normalized URL
 */
function normalizeGitHubUrl(url) {
  if (!url) return undefined;
  
  try {
    // Handle common variations in GitHub URLs
    let normalizedUrl = url.trim();
    
    // Ensure https:// protocol
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    
    // Try to parse the URL
    const parsedUrl = new URL(normalizedUrl);
    
    // Ensure it's a GitHub URL
    if (!parsedUrl.hostname.includes('github.com')) {
      return url; // Not a GitHub URL, return as is
    }
    
    // Extract path (owner/repo)
    const pathParts = parsedUrl.pathname.split('/');
    if (pathParts.length >= 3) {
      const owner = pathParts[1];
      const repo = pathParts[2].replace('.git', '');
      
      // Construct canonical form
      return `https://github.com/${owner}/${repo}`;
    }
    
    return url; // Couldn't normalize, return as is
  } catch (e) {
    // If URL parsing fails, return the original
    return url;
  }
}

/**
 * Delay execution for a specified time
 * @param {number} ms Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date for display
 * @param {string} dateString Date string to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return dateString;
  }
}

module.exports = {
  normalizeGitHubUrl,
  delay,
  formatDate
};
