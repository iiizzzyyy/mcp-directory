import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import StaticDocumentationSection from './StaticDocumentationSection';
import { MarkdownArticle } from '@/components/markdown/markdown-article';

interface ServerDocumentationProps {
  serverId: string;
  fullContent?: boolean;
}

// Define TypeScript interface for API response
interface DocumentationResponse {
  content: string;
  format: 'markdown' | 'html';
  title?: string;
}

export default async function ServerDocumentation({ 
  serverId,
  fullContent
}: ServerDocumentationProps) {
  try {
    // Create a Supabase client for server component
    const supabase = createServerComponentClient({ cookies });
    
    // Query server_documentation table
    const { data: docData, error } = await supabase
      .from('server_documentation')
      .select('*')
      .eq('server_id', serverId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch documentation: ${error.message}`);
    }
    
    // If no documentation found, try fetching from edge function as fallback
    if (!docData || !docData.content) {
      try {
        // Use a direct edge function call as fallback
        const { data, error } = await supabase.functions.invoke('get-server-documentation', {
          body: { serverId, fullContent }
        });

        if (error) throw error;
        
        if (data && data.content) {
          // Pass actual documentation content to the component directly
          return (
            <div className="documentation-container">
              <MarkdownArticle 
                content={data.content}
                title={data.title || "API Documentation"}
              />
            </div>
          );
        } else {
          // No documentation available
          return <StaticDocumentationSection serverId={serverId} />;
        }
      } catch (functionError) {
        console.error("Error fetching from edge function:", functionError);
        // Return empty state rather than error for better UX
        return <StaticDocumentationSection serverId={serverId} />;
      }
    }
    
    // Map database result to expected format for the component
    const documentation = {
      content: docData.content,
      format: docData.format || 'markdown',
      title: docData.title
    };
    
    // Return the documentation content with the fetched data
    return (
      <div className="documentation-container">
        <MarkdownArticle 
          content={documentation.content}
          title={documentation.title || "API Documentation"}
        />
      </div>
    );
    
  } catch (error) {
    console.error("Error in ServerDocumentation:", error);
    
    // Show error UI
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load documentation"}
        </AlertDescription>
      </Alert>
    );
  }
}
