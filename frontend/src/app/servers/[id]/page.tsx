import { notFound } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ServerDetailContent } from "@/components/server-detail/server-detail-content";

// Force dynamic rendering for all server detail pages
export const dynamic = "force-dynamic";
export const revalidate = 0; // No cache, always fetch fresh data

// Define the main page component to fetch and display server details
export default async function ServerDetailPage({ params }: { params: { id: string } }) {
  try {
    // Extract the server ID from the URL params
    const { id } = params;
    
    if (!id) {
      return notFound();
    }
    
    // Fetch server details from Supabase
    const server = await getServerDetail(id);
    
    // If no server was found, show 404
    if (!server) {
      return notFound();
    }
    
    // Render the server detail page with the retrieved data
    return <ServerDetailContent server={server} />;
  } catch (error) {
    // Handle errors gracefully by showing error UI
    console.error("Error in server detail page:", error);
    
    // Get mock data for fallback
    const { mockServers } = await import("@/lib/mock-data");
    const fallbackServer = mockServers[0];
    
    // Return error state to the UI component
    return (
      <ServerDetailContent 
        server={fallbackServer} 
        error={error instanceof Error ? error.message : "Failed to load server data"}
      />
    );
  }
}

// Interface for Server type if not already imported
interface Server {
  id: string;
  name: string;
  description: string;
  slug?: string;
  github_url?: string;
  stars?: number;
  forks?: number;
  last_updated?: string;
  category?: string;
  platform?: string;
  contributors?: number;
  tags?: string[];
  install_method?: string;
  compatibility?: {
    nodejs?: boolean;
    python?: boolean;
    go?: boolean;
    java?: boolean;
    rust?: boolean;
    [key: string]: boolean | undefined;
  };
  health?: {
    status?: string;
    uptime?: number;
    history?: Array<{
      date: string;
      status: string;
    }>;
  };
  changelog?: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
}

// Get server details directly from Supabase
async function getServerDetail(id: string): Promise<Server | null> {
  // Create a Supabase client for server component
  const supabase = createServerComponentClient({ cookies });
  
  try {
    console.log(`Fetching server details for ID: ${id}`);
    
    // Check if the ID is a UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let serverQuery;
    if (isUuid) {
      // If UUID, query directly by ID
      serverQuery = await supabase.from("servers").select("*").eq("id", id).maybeSingle();
    } else {
      // First try: exact match by slug
      serverQuery = await supabase.from("servers").select("*").eq("slug", id).maybeSingle();
      
      // Second try: exact match by name
      if (!serverQuery.data && !serverQuery.error) {
        serverQuery = await supabase.from("servers").select("*").eq("name", id).maybeSingle();
      }
      
      // Third try: case-insensitive match by name
      if (!serverQuery.data && !serverQuery.error) {
        serverQuery = await supabase.from("servers").select("*").ilike("name", id).maybeSingle();
      }
      
      // Fourth try: slug to name conversion (replacing hyphens with spaces)
      if (!serverQuery.data && !serverQuery.error) {
        serverQuery = await supabase.from("servers").select("*")
          .ilike("name", id.replace(/-/g, " "))
          .maybeSingle();
      }
      
      // Fifth try: partial name match as fallback
      if (!serverQuery.data && !serverQuery.error) {
        serverQuery = await supabase.from("servers").select("*")
          .ilike("name", `%${id}%`)
          .limit(1)
          .maybeSingle();
      }
    }
    
    const { data: server, error } = serverQuery;
    
    if (error) {
      console.error("Error fetching server from Supabase:", error.message);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (server) {
      console.log("Server details fetched successfully from database");
      return server as Server;
    }
    
    // No server found, but no error either
    console.log("No matching server found in database");
    return null;
  } catch (error) {
    console.error("Error in getServerDetail:", error);
    throw error;
  }
}
