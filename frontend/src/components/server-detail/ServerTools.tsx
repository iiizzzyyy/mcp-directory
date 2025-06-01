import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ClientToolsTab from "./ClientToolsTab";

interface ServerToolsProps {
  serverId: string;
  serverName: string;
}

/**
 * Server component that fetches tools data
 * 
 * This component replaces the previous client-side implementation
 * which used direct fetch calls to API endpoints
 */
export default async function ServerTools({ serverId, serverName }: ServerToolsProps) {
  try {
    // Create a Supabase client using server component pattern
    const supabase = createServerComponentClient({ cookies });

    // First attempt to use database query
    let tools;
    
    try {
      // Try fetching from the database first
      const { data, error } = await supabase
        .from("server_tools")
        .select("*")
        .eq("server_id", serverId);
        
      if (!error && data && data.length > 0) {
        tools = data;
      }
    } catch (dbError) {
      console.warn("Failed to fetch tools from database, falling back to edge function");
    }

    // If database fetch failed, fall back to edge function
    if (!tools) {
      // Call the edge function directly from the server component
      const response = await supabase.functions.invoke("server-tools", {
        body: { id: serverId }
      });
      
      if (response.error) {
        throw new Error(`Edge function error: ${response.error.message}`);
      }
      
      // Format the response data
      const result = response.data;
      tools = result?.data || [];
    }

    // If no tools were found
    if (!tools || tools.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No Tools Available</CardTitle>
            <CardDescription>
              No tools were detected for this MCP server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This MCP server may not expose any tools, or they might not be detectable through our scanning system.
            </p>
          </CardContent>
        </Card>
      );
    }

    // Pass the data to the client component
    return <ClientToolsTab tools={tools} serverId={serverId} serverName={serverName} />;
  } catch (error) {
    // Error handling
    console.error("Error fetching server tools:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load server tools"}
        </AlertDescription>
      </Alert>
    );
  }
}

/**
 * Loading state component for use with React Suspense
 */
export function ServerToolsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

const CardContent = ({ children }: { children: React.ReactNode }) => {
  return <div className="p-6">{children}</div>;
};
