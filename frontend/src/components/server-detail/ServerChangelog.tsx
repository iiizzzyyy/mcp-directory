import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import ChangelogSection, { ChangelogEntry } from "./ChangelogSection";

interface ServerChangelogProps {
  serverId: string;
}

/**
 * Server component that fetches and renders changelog data
 * 
 * This component replaces the previous client-side implementation
 * which used useFetch to call an API endpoint
 */
export default async function ServerChangelog({ serverId }: ServerChangelogProps) {
  // Mock data for fallback if needed
  const mockChangelogData: ChangelogEntry[] = [
    {
      version: "1.2.0",
      date: "2025-05-15",
      changes: [
        "Added support for TypeScript SDK",
        "Improved error handling",
        "Fixed cache invalidation issues",
      ],
    },
    {
      version: "1.1.0",
      date: "2025-04-01",
      changes: [
        "Added Python SDK support",
        "Performance improvements",
        "Bug fixes for authentication",
      ],
    },
    {
      version: "1.0.0",
      date: "2025-03-10",
      changes: ["Initial release", "Basic API functionality", "JavaScript SDK"],
    },
  ];

  try {
    // Create a Supabase client using server component pattern
    const supabase = createServerComponentClient({ cookies });

    // Fetch changelog data directly from the database
    const { data: changelogData, error } = await supabase
      .from("server_changelog")
      .select("*")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false });

    // Handle errors from Supabase
    if (error) {
      throw new Error(`Failed to fetch changelog: ${error.message}`);
    }

    // If no data, use mock data as fallback
    if (!changelogData || changelogData.length === 0) {
      return <ChangelogSection changelog={mockChangelogData} />;
    }

    // Format the changelog data to match expected ChangelogEntry structure
    const formattedChangelog: ChangelogEntry[] = changelogData.map((item) => ({
      version: item.version || "",
      date: item.date || "",
      changes: Array.isArray(item.changes) 
        ? item.changes 
        : typeof item.changes === "string"
          ? [item.changes]
          : item.content && typeof item.content === "string"
            ? [item.content]
            : [],
    }));

    // Return the changelog with the fetched data
    return <ChangelogSection changelog={formattedChangelog} />;
  } catch (error) {
    // Error handling
    console.error("Error fetching changelog:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load changelog data"}
        </AlertDescription>
      </Alert>
    );
  }
}

/**
 * Loading state component for use with React Suspense
 */
export function ServerChangelogSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
