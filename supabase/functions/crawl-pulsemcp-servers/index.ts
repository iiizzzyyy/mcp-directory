/**
 * crawl-pulsemcp-servers - Edge function to scrape MCP servers from PulseMCP
 *
 * This function:
 * 1. Scrapes the PulseMCP servers page
 * 2. Extracts server details including GitHub URLs
 * 3. Gets platform-specific installation instructions from GitHub repos
 * 4. Updates our database with the enhanced server data
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";

// Server platform types to extract installation instructions for
const TARGET_PLATFORMS = [
  "npm", "pip", "cargo", "docker", "curl", 
  "vscode", "cursor", "windsurf", "claude",
  "github", "copilot", "python", "nodejs"
];

interface ServerDetails {
  name: string;
  description: string;
  url: string;
  githubUrl: string;
  category?: string;
  tags?: string[];
  health_status?: string;
}

interface PlatformInstruction {
  platform: string;
  command: string;
  additional_steps?: string;
  requirements?: string;
}

interface GitHubData {
  readme?: string;
  platforms?: PlatformInstruction[];
}

interface ScrapingStats {
  processed: number;
  updated: number;
  failed: number;
  skipped: number;
  details: Record<string, any>[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request parameters
    const { limit = 5 } = await req.json().catch(() => ({}));
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const stats: ScrapingStats = { 
      processed: 0, 
      updated: 0, 
      failed: 0, 
      skipped: 0,
      details: [] 
    };
    
    // 1. Scrape the PulseMCP servers list
    console.log("Scraping PulseMCP servers list...");
    const serverUrls = await scrapeServersList(limit);
    
    console.log(`Found ${serverUrls.length} servers to process`);
    
    // 2. Process each server
    for (const serverUrl of serverUrls) {
      try {
        console.log(`Processing server: ${serverUrl}`);
        stats.processed++;
        
        // Extract server details
        const serverDetails = await scrapeServerDetails(serverUrl);
        if (!serverDetails.githubUrl) {
          console.log(`No GitHub URL found for ${serverUrl}, skipping`);
          stats.skipped++;
          stats.details.push({
            url: serverUrl,
            status: "skipped",
            reason: "No GitHub URL found"
          });
          continue;
        }
        
        // Extract GitHub data (docs and installation instructions)
        console.log(`Extracting GitHub data from: ${serverDetails.githubUrl}`);
        const githubData = await fetchGitHubData(serverDetails.githubUrl);
        
        // Update database
        console.log(`Updating database for: ${serverDetails.name}`);
        const result = await updateDatabase(supabase, serverDetails, githubData);
        
        if (result.error) {
          console.error(`Error updating database: ${result.error.message}`);
          stats.failed++;
          stats.details.push({
            url: serverUrl,
            status: "failed",
            reason: result.error.message
          });
        } else {
          stats.updated++;
          stats.details.push({
            url: serverUrl,
            status: "updated",
            id: result.data
          });
        }
      } catch (error) {
        console.error(`Error processing server ${serverUrl}: ${error.message}`);
        stats.failed++;
        stats.details.push({
          url: serverUrl,
          status: "failed",
          reason: error.message
        });
      }
    }
    
    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

/**
 * Scrape the PulseMCP servers listing page to get all server URLs
 */
async function scrapeServersList(limit = 5): Promise<string[]> {
  try {
    const response = await fetch("https://api.firecrawl.dev/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: "https://www.pulsemcp.com/servers",
        formats: ["links"],
        onlyMainContent: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to scrape PulseMCP servers: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Filter server detail links and limit results
    const serverUrls = data.links
      .filter(link => link.includes("pulsemcp.com/servers/") && !link.endsWith("/servers/"))
      .slice(0, limit);
      
    return serverUrls;
  } catch (error) {
    console.error(`Error scraping servers list: ${error.message}`);
    throw error;
  }
}

/**
 * Scrape details for a specific server from its PulseMCP page
 */
async function scrapeServerDetails(serverUrl: string): Promise<ServerDetails> {
  try {
    const response = await fetch("https://api.firecrawl.dev/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: serverUrl,
        formats: ["markdown", "links", "html"],
        onlyMainContent: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to scrape server details: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract server name from the first heading
    const nameMatch = data.markdown.match(/# (.*?)[\r\n]/);
    const name = nameMatch ? nameMatch[1].trim() : "Unknown Server";
    
    // Extract description - typically the first paragraph after the heading
    const descMatch = data.markdown.match(/# .*?[\r\n]+(.*?)[\r\n]/);
    const description = descMatch ? descMatch[1].trim() : "";
    
    // Extract GitHub URL from links
    const githubUrl = data.links.find(link => 
      link.includes("github.com") && 
      !link.includes("github.com/login") &&
      !link.includes("github.com/signup")
    ) || "";
    
    // Extract category and tags from page content
    const category = extractCategory(data.markdown);
    const tags = extractTags(data.markdown, name);
    
    // Extract health status if available
    const healthStatus = extractHealthStatus(data.html);
    
    return {
      name,
      description,
      url: serverUrl,
      githubUrl,
      category,
      tags,
      health_status: healthStatus
    };
  } catch (error) {
    console.error(`Error scraping server details: ${error.message}`);
    throw error;
  }
}

/**
 * Extract the server category from markdown content
 */
function extractCategory(markdown: string): string {
  // Look for category mentions in the markdown
  const categoryMatches = [
    { regex: /search|vector|embedding|retrieval|indexing/i, category: "search" },
    { regex: /memory|context|storage|database|db/i, category: "memory" },
    { regex: /ai|llm|language model|ml|machine learning/i, category: "ai" },
    { regex: /auth|authentication|security/i, category: "auth" },
    { regex: /image|vision|video|media/i, category: "media" },
    { regex: /text|content|document/i, category: "content" },
    { regex: /analytics|metrics|logging|monitor/i, category: "analytics" }
  ];
  
  for (const { regex, category } of categoryMatches) {
    if (regex.test(markdown)) {
      return category;
    }
  }
  
  return "other";
}

/**
 * Extract tags from markdown content
 */
function extractTags(markdown: string, name: string): string[] {
  const tags = ["mcp"];
  
  // Add server name components as tags
  const nameWords = name.toLowerCase().split(/\s+/);
  for (const word of nameWords) {
    if (word.length > 3 && !tags.includes(word)) {
      tags.push(word);
    }
  }
  
  // Look for common tag indicators
  const tagIndicators = [
    { regex: /vector|embedding|similarity/i, tag: "vector" },
    { regex: /search|query|find|lookup/i, tag: "search" },
    { regex: /memory|storage|database|db/i, tag: "memory" },
    { regex: /ai|llm|language model|ml|gpt|claude/i, tag: "ai" },
    { regex: /api|rest|graphql|endpoint/i, tag: "api" },
    { regex: /auth|authentication|security/i, tag: "auth" },
    { regex: /image|vision|video|media/i, tag: "media" },
    { regex: /text|content|document/i, tag: "content" },
    { regex: /open-?source/i, tag: "open-source" }
  ];
  
  for (const { regex, tag } of tagIndicators) {
    if (regex.test(markdown) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

/**
 * Extract health status from HTML content
 */
function extractHealthStatus(html: string): string {
  if (html.includes("status-badge-online") || html.includes("text-green")) {
    return "online";
  } else if (html.includes("status-badge-offline") || html.includes("text-red")) {
    return "offline";
  } else if (html.includes("status-badge-degraded") || html.includes("text-yellow")) {
    return "degraded";
  }
  
  return "unknown";
}

/**
 * Fetch GitHub data, including README and installation instructions
 */
async function fetchGitHubData(githubUrl: string): Promise<GitHubData> {
  if (!githubUrl) return { readme: "", platforms: [] };
  
  try {
    // Normalize GitHub URL
    const normalizedUrl = normalizeGitHubUrl(githubUrl);
    
    // First get the README content
    const readmeResponse = await fetch("https://api.firecrawl.dev/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: `${normalizedUrl}`,
        formats: ["markdown"],
        onlyMainContent: true
      })
    });
    
    if (!readmeResponse.ok) {
      throw new Error(`Failed to fetch GitHub README: ${readmeResponse.statusText}`);
    }
    
    const readmeData = await readmeResponse.json();
    const readme = readmeData.markdown || "";
    
    // Now extract installation instructions for different platforms
    const extractResponse = await fetch("https://api.firecrawl.dev/extract", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        urls: [normalizedUrl],
        prompt: `Extract detailed installation instructions for different platforms from this GitHub repository. 
                Focus specifically on these platforms: ${TARGET_PLATFORMS.join(", ")}.
                For each platform, provide the exact installation command and any additional setup steps required.`,
        schema: {
          type: "object",
          properties: {
            platforms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  platform: { type: "string" },
                  command: { type: "string" },
                  additional_steps: { type: "string" },
                  requirements: { type: "string" }
                },
                required: ["platform", "command"]
              }
            }
          }
        }
      })
    });
    
    if (!extractResponse.ok) {
      throw new Error(`Failed to extract installation instructions: ${extractResponse.statusText}`);
    }
    
    const extractData = await extractResponse.json();
    const platforms = extractData.results?.[0]?.platforms || [];
    
    return { readme, platforms };
  } catch (error) {
    console.error(`Error fetching GitHub data: ${error.message}`);
    return { readme: "", platforms: [] };
  }
}

/**
 * Update database with server details and installation instructions
 */
async function updateDatabase(
  supabase: any, 
  serverDetails: ServerDetails, 
  githubData: GitHubData
) {
  try {
    // Check if server already exists by GitHub URL
    const { data: existingServer, error: lookupError } = await supabase
      .from("servers")
      .select("id, name")
      .eq("github_url", serverDetails.githubUrl)
      .maybeSingle();
    
    if (lookupError) {
      console.error(`Error looking up server: ${lookupError.message}`);
      return { error: lookupError };
    }
    
    let serverId;
    
    // If server exists, update it
    if (existingServer) {
      console.log(`Updating existing server: ${existingServer.name}`);
      
      const { error: updateError } = await supabase
        .from("servers")
        .update({
          name: serverDetails.name,
          description: serverDetails.description,
          documentation: githubData.readme,
          category: serverDetails.category,
          tags: serverDetails.tags,
          health_status: serverDetails.health_status,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingServer.id);
      
      if (updateError) {
        return { error: updateError };
      }
      
      serverId = existingServer.id;
    } else {
      // If server doesn't exist, insert it
      console.log(`Creating new server: ${serverDetails.name}`);
      
      const { data: newServer, error: insertError } = await supabase
        .from("servers")
        .insert({
          name: serverDetails.name,
          description: serverDetails.description,
          github_url: serverDetails.githubUrl,
          documentation: githubData.readme,
          category: serverDetails.category || "other",
          tags: serverDetails.tags || ["mcp"],
          health_status: serverDetails.health_status || "unknown",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        return { error: insertError };
      }
      
      serverId = newServer.id;
    }
    
    // Update installation instructions
    if (githubData.platforms && githubData.platforms.length > 0) {
      console.log(`Adding ${githubData.platforms.length} installation instructions`);
      
      for (const platform of githubData.platforms) {
        const { error: installError } = await supabase
          .from("server_install_instructions")
          .upsert({
            server_id: serverId,
            platform: platform.platform,
            install_command: platform.command,
            additional_steps: platform.additional_steps || null,
            requirements: platform.requirements || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: "server_id,platform"
          });
        
        if (installError) {
          console.error(`Error updating installation for ${platform.platform}: ${installError.message}`);
          // Continue with other platforms even if one fails
        }
      }
    }
    
    return { data: serverId };
  } catch (error) {
    console.error(`Error updating database: ${error.message}`);
    return { error };
  }
}

/**
 * Normalize GitHub URL to standard format
 */
function normalizeGitHubUrl(url: string): string {
  // Remove trailing slash if present
  let normalized = url.trim().replace(/\/+$/, "");
  
  // Ensure we're using the regular github.com domain (not github.io, etc.)
  if (!normalized.includes("github.com")) {
    return normalized; // Not a GitHub URL, return as is
  }
  
  // Remove any fragment or query parameters
  normalized = normalized.split("#")[0].split("?")[0];
  
  // Remove any specific paths like /blob/, /tree/, etc.
  const regex = /^(https?:\/\/github\.com\/[^\/]+\/[^\/]+).*/;
  const match = normalized.match(regex);
  
  return match ? match[1] : normalized;
}
