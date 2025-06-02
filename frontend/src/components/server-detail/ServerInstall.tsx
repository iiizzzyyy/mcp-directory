import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import ClientInstallationTab from "./ClientInstallationTab";

interface InstallInstruction {
  platform: string;
  icon_url: string | null;
  install_command: string;
  additional_steps?: string | null;
  requirements?: string | null;
}

interface ServerInstallProps {
  serverId: string;
  serverName?: string;
  defaultInstallCommand?: string;
}

/**
 * Server component that fetches installation instructions
 * 
 * This component replaces the previous client-side implementation
 * which used direct fetch calls to edge functions
 * 
 * Updated to handle HTML content in the install_instructions field
 */
export default async function ServerInstall({ 
  serverId, 
  serverName, 
  defaultInstallCommand 
}: ServerInstallProps) {
  try {
    // Create a Supabase client using server component pattern
    const supabase = createServerComponentClient({ cookies });
    
    // First attempt to use our new API endpoint
    let result;
    
    try {
      // Try fetching from the database first
      const { data, error } = await supabase
        .from("server_install")
        .select("*")
        .eq("server_id", serverId);
        
      if (!error && data && data.length > 0) {
        result = { data };
      }
    } catch (dbError) {
      console.warn("Failed to fetch from database, falling back to edge function");
    }
    
    // If database fetch failed, fall back to edge function
    if (!result) {
      // Call the edge function directly from the server component
      const response = await supabase.functions.invoke("servers-install", {
        body: { id: serverId }
      });
      
      if (response.error) {
        throw new Error(`Edge function error: ${response.error.message}`);
      }
      
      result = response.data;
    }
    
    // Check for newer response format from the edge function (with instructions object)
    if (result && result.instructions && typeof result.instructions === 'object') {
      // Convert the object format to array format expected by ClientInstallationTab
      const instructionsArray = Object.entries(result.instructions)
        .filter(([platform]) => platform !== 'all') // Filter out 'all' platform as it's handled separately
        .map(([platform, instructions]) => ({
          platform,
          install_command: typeof instructions === 'string' ? instructions : JSON.stringify(instructions),
        }));
      
      // Check if there's HTML content in the 'all' platform
      const htmlInstructions = {};
      if (result.instructions.all) {
        htmlInstructions.all = result.instructions.all;
      }
      
      return (
        <ClientInstallationTab
          instructions={instructionsArray}
          serverId={serverId}
          serverName={serverName}
          defaultInstallCommand={defaultInstallCommand}
          htmlInstructions={htmlInstructions}
        />
      );
    }
    // Handle legacy array format
    else if (result && result.data && Array.isArray(result.data)) {
      return (
        <ClientInstallationTab
          instructions={result.data}
          serverId={serverId}
          serverName={serverName}
          defaultInstallCommand={defaultInstallCommand}
        />
      );
    } else {
      // If no specific instructions, render with empty array
      return (
        <ClientInstallationTab
          instructions={[]}
          serverId={serverId}
          serverName={serverName}
          defaultInstallCommand={defaultInstallCommand}
        />
      );
    }
  } catch (error) {
    // Error handling
    console.error("Error fetching installation instructions:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load installation instructions"}
        </AlertDescription>
      </Alert>
    );
  }
}

/**
 * Loading state component for use with React Suspense
 */
export function ServerInstallSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="border rounded-lg p-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
    </div>
  );
}
