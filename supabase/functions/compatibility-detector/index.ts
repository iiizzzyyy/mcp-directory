import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GitHub API token for authenticated requests
const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';

// Platform compatibility keywords to search for
const platforms = [
  {
    id: 'node',
    name: 'Node.js',
    keywords: ['node', 'nodejs', 'node.js'],
    filePatterns: ['package.json', 'yarn.lock', 'npm', '.nvmrc', 'node_modules'],
  },
  {
    id: 'python',
    name: 'Python',
    keywords: ['python', 'py', 'pip'],
    filePatterns: ['requirements.txt', 'setup.py', 'Pipfile', '.py', 'pyproject.toml'],
  },
  {
    id: 'rust',
    name: 'Rust',
    keywords: ['rust', 'cargo', 'rustc'],
    filePatterns: ['Cargo.toml', 'Cargo.lock', '.rs'],
  },
  {
    id: 'go',
    name: 'Go',
    keywords: ['golang', 'go '],
    filePatterns: ['go.mod', 'go.sum', '.go'],
  },
  {
    id: 'ruby',
    name: 'Ruby',
    keywords: ['ruby', 'gem '],
    filePatterns: ['Gemfile', 'Gemfile.lock', '.rb', '.gemspec'],
  },
  {
    id: 'php',
    name: 'PHP',
    keywords: ['php'],
    filePatterns: ['composer.json', 'composer.lock', '.php'],
  },
  {
    id: 'java',
    name: 'Java',
    keywords: ['java', 'javac', 'jdk', 'jre'],
    filePatterns: ['pom.xml', 'build.gradle', '.java', 'maven'],
  },
  {
    id: 'dotnet',
    name: '.NET',
    keywords: ['.net', 'dotnet', 'csharp', 'c#'],
    filePatterns: ['.csproj', '.sln', '.cs', '.vb', '.fs'],
  },
  {
    id: 'deno',
    name: 'Deno',
    keywords: ['deno'],
    filePatterns: ['deno.json', 'deno.lock', 'deps.ts', 'import_map.json'],
  },
  {
    id: 'docker',
    name: 'Docker',
    keywords: ['docker', 'container'],
    filePatterns: ['Dockerfile', 'docker-compose.yml', '.dockerignore'],
  },
  {
    id: 'browser',
    name: 'Browser',
    keywords: ['browser', 'chrome', 'firefox', 'safari', 'edge'],
    filePatterns: ['browser', '.js', '.ts', '.html', '.jsx', '.tsx'],
  },
  {
    id: 'aws',
    name: 'AWS',
    keywords: ['aws', 'amazon web services', 'lambda', 's3', 'ec2', 'cloudformation'],
    filePatterns: ['serverless.yml', 'aws', 'cloudformation.yml', 'terraform'],
  },
  {
    id: 'macos',
    name: 'macOS',
    keywords: ['macos', 'osx', 'mac os'],
    filePatterns: ['.app', 'Info.plist', 'darwin'],
  },
  {
    id: 'linux',
    name: 'Linux',
    keywords: ['linux', 'ubuntu', 'debian', 'centos', 'fedora', 'redhat'],
    filePatterns: ['.sh', 'linux'],
  },
  {
    id: 'windows',
    name: 'Windows',
    keywords: ['windows', 'win32', 'win64', 'winnt'],
    filePatterns: ['.exe', '.bat', '.ps1', 'windows'],
  },
];

/**
 * Compatibility detector for MCP servers
 * 
 * This function:
 * 1. Retrieves MCP servers that need compatibility analysis
 * 2. Extracts GitHub repo information
 * 3. Analyzes repo content for platform compatibility
 * 4. Stores the compatibility data in the database
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Get servers that need compatibility analysis
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id, name, github_url')
      .is('last_compatibility_scan', null)
      .is('github_url', 'not.null')
      .limit(5);
    
    if (serversError) {
      throw new Error(`Error fetching servers: ${serversError.message}`);
    }
    
    const results = [];
    
    // Process each server
    for (const server of servers) {
      try {
        if (!server.github_url) {
          continue;
        }
        
        // Extract owner and repo name from GitHub URL
        const repoInfo = extractGitHubRepoInfo(server.github_url);
        if (!repoInfo) {
          console.log(`Invalid GitHub URL for server ${server.name}: ${server.github_url}`);
          continue;
        }
        
        const { owner, repo } = repoInfo;
        
        // Detect compatibility from repo
        const compatibilityData = await detectCompatibility(owner, repo);
        
        // Store compatibility data
        await storeCompatibilityData(server.id, compatibilityData);
        
        // Update server's last scan timestamp
        await supabase
          .from('servers')
          .update({ last_compatibility_scan: new Date().toISOString() })
          .eq('id', server.id);
        
        results.push({
          server_id: server.id,
          name: server.name,
          platforms_detected: compatibilityData.length,
          status: 'success'
        });
      } catch (err) {
        console.error(`Error detecting compatibility for ${server.name}:`, err);
        results.push({
          server_id: server.id,
          name: server.name,
          status: 'error',
          error: err.message
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        servers_processed: servers.length,
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Compatibility detection error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

/**
 * Extract owner and repo name from a GitHub URL
 * 
 * @param githubUrl GitHub repository URL
 * @returns Object with owner and repo properties, or null if invalid
 */
function extractGitHubRepoInfo(githubUrl) {
  try {
    const url = new URL(githubUrl);
    if (url.hostname !== 'github.com') {
      return null;
    }
    
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    
    return {
      owner: parts[0],
      repo: parts[1]
    };
  } catch (err) {
    return null;
  }
}

/**
 * Detect platform compatibility for a GitHub repository
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns Array of compatibility objects
 */
async function detectCompatibility(owner, repo) {
  const compatibilityResults = [];
  
  try {
    // Get repository metadata and files
    const [repoData, filesData, readmeContent] = await Promise.all([
      fetchGitHubRepo(owner, repo),
      fetchGitHubRepoContents(owner, repo),
      fetchGitHubReadme(owner, repo)
    ]);
    
    // Check each platform
    for (const platform of platforms) {
      const result = {
        platform: platform.id,
        platform_name: platform.name,
        status: 'unknown',
        version: null,
        notes: null
      };
      
      // Check file patterns for compatibility
      const fileMatch = filesData.some(file => {
        const fileName = file.name?.toLowerCase() || '';
        return platform.filePatterns.some(pattern => fileName.includes(pattern));
      });
      
      // Check repository topics
      const topicMatch = repoData.topics?.some(topic => 
        platform.keywords.some(keyword => topic.toLowerCase().includes(keyword))
      );
      
      // Check README content
      const readmeMatch = platform.keywords.some(keyword => 
        readmeContent.toLowerCase().includes(keyword)
      );
      
      // Determine compatibility status
      if (fileMatch || topicMatch) {
        result.status = 'supported';
        
        // Try to detect version information
        const versionInfo = extractVersionInfo(readmeContent, platform);
        if (versionInfo) {
          result.version = versionInfo;
        }
        
        // Add any compatibility notes
        const notes = extractCompatibilityNotes(readmeContent, platform);
        if (notes) {
          result.notes = notes;
        }
      } else if (readmeMatch) {
        result.status = 'partial';
        
        const notes = extractCompatibilityNotes(readmeContent, platform);
        if (notes) {
          result.notes = notes;
        }
      }
      
      // Only add platforms with some level of compatibility detected
      if (result.status !== 'unknown') {
        compatibilityResults.push(result);
      }
    }
    
    return compatibilityResults;
  } catch (err) {
    console.error(`Error detecting compatibility for ${owner}/${repo}:`, err);
    return [];
  }
}

/**
 * Fetch GitHub repository metadata
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns Repository metadata
 */
async function fetchGitHubRepo(owner, repo) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${githubToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error(`Error fetching GitHub repo ${owner}/${repo}:`, err);
    return {};
  }
}

/**
 * Fetch GitHub repository contents (files and directories)
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns Array of repository content items
 */
async function fetchGitHubRepoContents(owner, repo) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${githubToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error(`Error fetching GitHub repo contents ${owner}/${repo}:`, err);
    return [];
  }
}

/**
 * Fetch GitHub repository README content
 * 
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
 * @returns README content as string
 */
async function fetchGitHubReadme(owner, repo) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
        'Authorization': `token ${githubToken}`
      }
    });
    
    if (!response.ok) {
      return ''; // No README or error
    }
    
    return await response.text();
  } catch (err) {
    console.error(`Error fetching GitHub README ${owner}/${repo}:`, err);
    return '';
  }
}

/**
 * Extract version information for a platform from README content
 * 
 * @param readmeContent README content as string
 * @param platform Platform object
 * @returns Version information or null
 */
function extractVersionInfo(readmeContent, platform) {
  if (!readmeContent) {
    return null;
  }
  
  const lowercaseContent = readmeContent.toLowerCase();
  
  // Check for version mentions near platform keywords
  for (const keyword of platform.keywords) {
    const index = lowercaseContent.indexOf(keyword);
    if (index !== -1) {
      // Get content around the keyword
      const startIndex = Math.max(0, index - 50);
      const endIndex = Math.min(lowercaseContent.length, index + keyword.length + 50);
      const contextText = lowercaseContent.substring(startIndex, endIndex);
      
      // Try to extract version patterns
      const versionMatches = [
        // Match v1.2.3
        /v(\d+\.\d+(\.\d+)?)/i,
        // Match version 1.2.3
        /version\s+(\d+\.\d+(\.\d+)?)/i,
        // Match >= 1.2.3
        />=\s*(\d+\.\d+(\.\d+)?)/i,
        // Match ^1.2.3
        /\^\s*(\d+\.\d+(\.\d+)?)/i,
        // Match 1.2.x
        /(\d+\.\d+\.x)/i,
      ];
      
      for (const pattern of versionMatches) {
        const match = contextText.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract compatibility notes for a platform from README content
 * 
 * @param readmeContent README content as string
 * @param platform Platform object
 * @returns Compatibility notes or null
 */
function extractCompatibilityNotes(readmeContent, platform) {
  if (!readmeContent) {
    return null;
  }
  
  const lowercaseContent = readmeContent.toLowerCase();
  
  // Look for compatibility sections
  const compatSections = [
    'compatibility',
    'requirements',
    'prerequisites',
    'supported platforms',
    'system requirements'
  ];
  
  for (const section of compatSections) {
    const sectionIndex = lowercaseContent.indexOf(section);
    if (sectionIndex !== -1) {
      // Get content after section heading
      const startIndex = sectionIndex + section.length;
      const endIndex = Math.min(
        lowercaseContent.indexOf('\n\n', startIndex + 1) !== -1 ? 
          lowercaseContent.indexOf('\n\n', startIndex + 1) : 
          lowercaseContent.length,
        startIndex + 200
      );
      
      const sectionText = readmeContent.substring(startIndex, endIndex).trim();
      
      // Look for platform mentions in this section
      for (const keyword of platform.keywords) {
        if (sectionText.toLowerCase().includes(keyword)) {
          // Get the sentence containing the keyword
          const sentences = sectionText.split(/\.\s+/);
          for (const sentence of sentences) {
            if (sentence.toLowerCase().includes(keyword)) {
              return sentence.trim() + '.';
            }
          }
          
          // If can't find specific sentence, return a portion of the section
          return sectionText.length > 100 ? sectionText.substring(0, 100) + '...' : sectionText;
        }
      }
    }
  }
  
  return null;
}

/**
 * Store compatibility data in the database
 * 
 * @param serverId Server ID
 * @param compatibilityData Array of compatibility objects
 */
async function storeCompatibilityData(serverId, compatibilityData) {
  if (!compatibilityData || compatibilityData.length === 0) {
    return;
  }
  
  try {
    // First delete existing compatibility data for this server
    await supabase
      .from('server_compatibility')
      .delete()
      .eq('server_id', serverId);
    
    // Insert new compatibility data
    for (const compat of compatibilityData) {
      await supabase
        .from('server_compatibility')
        .insert({
          server_id: serverId,
          platform: compat.platform,
          platform_name: compat.platform_name,
          status: compat.status,
          version: compat.version,
          notes: compat.notes
        });
    }
  } catch (err) {
    console.error(`Error storing compatibility data for server ${serverId}:`, err);
    throw err;
  }
}
