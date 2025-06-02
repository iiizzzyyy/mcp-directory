/**
 * README Parser Module
 * 
 * This module fetches and parses GitHub README files to extract structured information
 * for populating server detail page tabs. It includes functions for extracting
 * installation instructions, API documentation, compatibility information, and more.
 */
require('dotenv').config();

/**
 * Fetches README content from GitHub API
 * 
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Object containing README content and metadata
 */
async function fetchReadmeContent(owner, repo) {
  try {
    // First try to fetch the raw README content directly (works for public repos without auth)
    const rawReadmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
    console.log(`Trying to fetch README from ${rawReadmeUrl}`);
    
    let response = await fetch(rawReadmeUrl);
    
    // If main branch failed, try master branch
    if (!response.ok && response.status === 404) {
      const masterReadmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`;
      console.log(`Main branch not found, trying master: ${masterReadmeUrl}`);
      response = await fetch(masterReadmeUrl);
    }
    
    // If we successfully got the README directly
    if (response.ok) {
      const content = await response.text();
      return {
        content,
        name: 'README.md',
        path: 'README.md',
        sha: null, // We don't have this info from raw content
        size: content.length,
        url: `https://github.com/${owner}/${repo}/blob/main/README.md`
      };
    }
    
    // If direct fetch failed, try the GitHub API with auth if available
    console.log(`Direct fetch failed, trying GitHub API`);
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Add auth token if available
    if (process.env.GITHUB_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_API_TOKEN}`;
      console.log('Using GitHub API token for authentication');
    }
    
    response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`README not found for ${owner}/${repo}`);
        return null;
      }
      
      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = new Date(parseInt(response.headers.get('x-ratelimit-reset')) * 1000);
        console.error(`GitHub API rate limit exceeded. Reset at ${resetTime}`);
        throw new Error(`GitHub API rate limit exceeded. Reset at ${resetTime}`);
      }
      
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // README content is base64 encoded
    if (data.content && data.encoding === 'base64') {
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      return {
        content,
        name: data.name,
        path: data.path,
        sha: data.sha,
        size: data.size,
        url: data.html_url
      };
    }
    
    throw new Error('README content is not available or not base64 encoded');
  } catch (error) {
    console.error(`Error fetching README for ${owner}/${repo}:`, error);
    throw error;
  }
}

/**
 * Parses README content into sections based on headings
 * 
 * @param {string} content - Raw README content
 * @returns {Object} Object with sections as keys and content as values
 */
function parseReadmeContent(content) {
  if (!content) {
    return { overview: '' };
  }
  
  // Split content by headings
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const sections = {};
  let lastHeading = 'overview';
  let lastIndex = 0;
  
  // Extract overview (content before first heading)
  const firstHeadingMatch = content.match(headingRegex);
  if (firstHeadingMatch && firstHeadingMatch.index > 0) {
    sections.overview = content.substring(0, firstHeadingMatch.index).trim();
    lastIndex = firstHeadingMatch.index;
  } else {
    sections.overview = content.trim();
    return sections;
  }
  
  // Reset regex
  headingRegex.lastIndex = 0;
  
  // Find all headings and their content
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const [fullMatch, hashes, heading] = match;
    const normalizedHeading = normalizeHeading(heading);
    
    // Add content from previous heading to current heading
    if (lastHeading && lastIndex < match.index) {
      sections[lastHeading] = (sections[lastHeading] || '') + 
        content.substring(lastIndex, match.index).trim();
    }
    
    lastHeading = normalizedHeading;
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add content after the last heading
  if (lastHeading && lastIndex < content.length) {
    sections[lastHeading] = (sections[lastHeading] || '') + 
      content.substring(lastIndex).trim();
  }
  
  return sections;
}

/**
 * Normalizes heading text to be used as a key
 * 
 * @param {string} heading - Heading text
 * @returns {string} Normalized heading
 */
function normalizeHeading(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Extracts installation instructions from README content
 * 
 * @param {string} content - Raw README content or specific section
 * @returns {Object} Installation instructions with code blocks
 */
function extractInstallationInstructions(content) {
  if (!content) {
    return { instructions: '', codeBlocks: [] };
  }
  
  // Look for installation section or related headings
  const sections = parseReadmeContent(content);
  
  // Try to find installation section with various common names
  const possibleSections = [
    'installation', 'install', 'getting_started', 'getting-started', 'getting_started',
    'quickstart', 'quick_start', 'setup', 'how_to_install', 'how_to_use'
  ];
  
  let installationContent = '';
  
  for (const section of possibleSections) {
    if (sections[section]) {
      installationContent = sections[section];
      break;
    }
  }
  
  // If no installation section found, try to find installation instructions in overview
  if (!installationContent && sections.overview) {
    // Look for keywords in overview that might indicate installation instructions
    const installKeywords = ['install', 'npm install', 'yarn add', 'pip install', 'brew install'];
    if (installKeywords.some(keyword => sections.overview.includes(keyword))) {
      installationContent = sections.overview;
    }
  }
  
  // Extract code blocks (potential installation commands)
  const codeBlockRegex = /```(?:sh|bash|javascript|typescript|js|ts|python|ruby|go|java|shell)?\n([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;
  
  while ((match = codeBlockRegex.exec(installationContent)) !== null) {
    codeBlocks.push(match[1].trim());
  }
  
  // Try to extract inline code blocks if no fenced code blocks found
  if (codeBlocks.length === 0) {
    const inlineCodeRegex = /`([^`]+)`/g;
    while ((match = inlineCodeRegex.exec(installationContent)) !== null) {
      if (match[1].includes('install') || match[1].includes('npm') || 
          match[1].includes('yarn') || match[1].includes('pip')) {
        codeBlocks.push(match[1].trim());
      }
    }
  }
  
  return {
    instructions: installationContent,
    codeBlocks
  };
}

/**
 * Extracts API documentation from README content
 * 
 * @param {string} content - Raw README content or specific section
 * @returns {Object} API documentation with endpoints and descriptions
 */
function extractAPIDocumentation(content) {
  if (!content) {
    return { documentation: '', endpoints: [] };
  }
  
  // Look for API section or related headings
  const sections = parseReadmeContent(content);
  
  // Try to find API section with various common names
  const possibleSections = [
    'api', 'api_reference', 'api_documentation', 'endpoints', 'methods',
    'functions', 'usage', 'how_to_use', 'examples'
  ];
  
  let apiContent = '';
  
  for (const section of possibleSections) {
    if (sections[section]) {
      apiContent = sections[section];
      break;
    }
  }
  
  // Extract potential API endpoints
  // This regex looks for patterns like:
  // GET /api/resource
  // POST /endpoint
  // or endpoints in code blocks or tables
  const endpointRegex = /(?:`|\*\*|\b)(?:GET|POST|PUT|DELETE|PATCH)\s+([/\w\-{}.]+)(?:`|\*\*|\b)/g;
  
  const endpoints = [];
  let match;
  
  while ((match = endpointRegex.exec(apiContent)) !== null) {
    endpoints.push({
      path: match[1],
      method: match[0].trim().split(/\s+/)[0].replace(/`|\*\*/g, '')
    });
  }
  
  return {
    documentation: apiContent,
    endpoints
  };
}

/**
 * Extracts compatibility information from README content
 * 
 * @param {string} content - Raw README content or specific section
 * @returns {Object} Compatibility information with platforms and versions
 */
function extractCompatibilityInfo(content) {
  if (!content) {
    return { compatibility: '', platforms: [] };
  }
  
  // Look for compatibility section or related headings
  const sections = parseReadmeContent(content);
  
  // Try to find compatibility section with various common names
  const possibleSections = [
    'compatibility', 'requirements', 'prerequisites', 'supported_platforms',
    'supported_versions', 'system_requirements', 'dependencies'
  ];
  
  let compatibilityContent = '';
  
  for (const section of possibleSections) {
    if (sections[section]) {
      compatibilityContent = sections[section];
      break;
    }
  }
  
  // Try to extract platform information
  const platformPatterns = [
    'nodejs', 'node.js', 'python', 'ruby', 'go', 'java', 'php',
    'windows', 'mac', 'linux', 'android', 'ios', 'browser'
  ];
  
  const platforms = [];
  
  for (const platform of platformPatterns) {
    const regex = new RegExp(`\\b${platform}\\b`, 'i');
    if (regex.test(compatibilityContent)) {
      platforms.push(platform.toLowerCase());
    }
  }
  
  // Try to extract version information
  const versionRegex = /(?:v\d+\.\d+\.\d+|\d+\.\d+\.\d+|\d+\.\d+|node >=?\s*\d+\.\d+)/gi;
  let versionMatch;
  
  while ((versionMatch = versionRegex.exec(compatibilityContent)) !== null) {
    const version = versionMatch[0].trim();
    if (!platforms.includes(version)) {
      platforms.push(version);
    }
  }
  
  return {
    compatibility: compatibilityContent,
    platforms
  };
}

/**
 * Extracts changelog information from README content
 * 
 * @param {string} content - Raw README content or specific section
 * @returns {Object} Changelog information with versions and descriptions
 */
function extractChangelog(content) {
  if (!content) {
    return { changelog: '', versions: [] };
  }
  
  // Look for changelog section or related headings
  const sections = parseReadmeContent(content);
  
  // Try to find changelog section with various common names
  const possibleSections = [
    'changelog', 'changes', 'release_notes', 'releases', 'history',
    'whats_new', 'versions'
  ];
  
  let changelogContent = '';
  
  for (const section of possibleSections) {
    if (sections[section]) {
      changelogContent = sections[section];
      break;
    }
  }
  
  // Try to extract version information
  // This regex looks for version numbers at the start of lines or after heading markers
  const versionRegex = /^(?:###?\s+)?v?(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9.]+)?)\s+-?\s*(.*?)$/gm;
  
  const versions = [];
  let match;
  
  while ((match = versionRegex.exec(changelogContent)) !== null) {
    versions.push({
      version: match[1],
      description: match[2].trim()
    });
  }
  
  return {
    changelog: changelogContent,
    versions
  };
}

/**
 * Main function to extract all relevant sections from a README
 * 
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Structured content from README
 */
async function extractReadmeData(owner, repo) {
  try {
    const readme = await fetchReadmeContent(owner, repo);
    
    if (!readme) {
      console.warn(`No README found for ${owner}/${repo}`);
      return null;
    }
    
    const content = readme.content;
    const sections = parseReadmeContent(content);
    
    // Extract specific information
    const installation = extractInstallationInstructions(content);
    const api = extractAPIDocumentation(content);
    const compatibility = extractCompatibilityInfo(content);
    const changelog = extractChangelog(content);
    
    return {
      overview: sections.overview || '',
      installation,
      api,
      compatibility,
      changelog,
      metadata: {
        readmeName: readme.name,
        readmePath: readme.path,
        readmeSha: readme.sha,
        readmeUrl: readme.url
      }
    };
  } catch (error) {
    console.error(`Error extracting README data for ${owner}/${repo}:`, error);
    throw error;
  }
}

module.exports = {
  fetchReadmeContent,
  parseReadmeContent,
  extractInstallationInstructions,
  extractAPIDocumentation,
  extractCompatibilityInfo,
  extractChangelog,
  extractReadmeData
};
