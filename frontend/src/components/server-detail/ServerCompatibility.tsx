import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import CompatibilityMatrix, { CompatibilityItem } from "./CompatibilityMatrix";

interface ServerCompatibilityProps {
  serverId: string;
}

/**
 * Server component that fetches and renders compatibility data
 * 
 * This component replaces the previous client-side implementation
 * which used useFetch to call an API endpoint
 */
export default async function ServerCompatibility({ serverId }: ServerCompatibilityProps) {
  try {
    // Create a Supabase client using server component pattern
    const supabase = createServerComponentClient({ cookies });

    // Fetch compatibility data directly from the database
    const { data: compatibilityData, error } = await supabase
      .from("server_compatibility")
      .select("*")
      .eq("server_id", serverId);

    // Handle errors from Supabase
    if (error) {
      throw new Error(`Failed to fetch compatibility data: ${error.message}`);
    }

    // If no data, return an empty matrix
    if (!compatibilityData || compatibilityData.length === 0) {
      return <CompatibilityMatrix compatibility={[]} />;
    }

    // Format the compatibility data to match expected CompatibilityItem structure
    const formattedCompatibility: CompatibilityItem[] = compatibilityData.map(
      (item) => ({
        platform: item.platform || "",
        version: item.version || "",
        status: item.status || "unknown",
        notes: item.notes || "",
      })
    );

    // Return the compatibility matrix with the fetched data
    return <CompatibilityMatrix compatibility={formattedCompatibility} />;
  } catch (error) {
    // Error handling
    console.error("Error fetching compatibility data:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load compatibility data"}
        </AlertDescription>
      </Alert>
    );
  }
}

/**
 * Loading state component for use with React Suspense
 */
export function ServerCompatibilitySkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-[120px] w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
