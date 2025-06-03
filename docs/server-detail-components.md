# Server Detail Components Documentation

This document provides detailed information about the components used in the server detail pages, focusing on the rendering of rich README content and installation instructions.

## Components Overview

### OverviewTab Component

**File Path**: `frontend/src/components/server-detail/OverviewTab.tsx`

**Purpose**: Renders the server overview information, including rich HTML content from the `readme_overview` field with fallback to plain text description.

**Props Interface**:
```typescript
interface OverviewTabProps {
  description: string;
  readme_overview?: string;
}
```

**Rendering Logic**:
1. If `readme_overview` is available, it renders the HTML content using `dangerouslySetInnerHTML`
2. If `readme_overview` is not available, it falls back to rendering the plain text `description`
3. Uses Tailwind's `prose` classes to style the rendered HTML content

**Example Implementation**:
```tsx
export function OverviewTab({ description, readme_overview }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {readme_overview ? (
        <div 
          className="prose prose-sm sm:prose-base lg:prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: readme_overview }}
        />
      ) : (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
```

**HTML Sanitization**:
- The component uses React's `dangerouslySetInnerHTML` to render the HTML content
- Content should be pre-sanitized on the server side before storage to prevent XSS attacks
- For future enhancement: Consider adding a client-side sanitization library like DOMPurify

### ServerDetailClient Component

**File Path**: `frontend/src/app/servers/[id]/page-client.tsx`

**Purpose**: Main component for the server detail page that handles fetching server data and rendering all tabs, including the Overview tab with README content.

**Integration with OverviewTab**:
1. Imports the `OverviewTab` component
2. Passes the server's `description` and `readme_overview` props to the component
3. Renders the component within the Overview tab's content section

**Example Integration**:
```tsx
// Inside ServerDetailClient component
<Tabs defaultValue="overview">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="installation">Installation</TabsTrigger>
    <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
    <TabsTrigger value="changelog">Changelog</TabsTrigger>
  </TabsList>
  <TabsContent value="overview" className="py-4">
    <OverviewTab 
      description={server.description} 
      readme_overview={server.readme_overview} 
    />
  </TabsContent>
  {/* Other tabs content */}
</Tabs>
```

## Installation API

**File Path**: `frontend/src/app/api/servers/[id]/install/route.ts`

**Purpose**: Provides installation instructions and code blocks for servers, with fallback mechanisms for data retrieval.

**Data Flow**:
1. First attempts to fetch from the Supabase edge function with service role key authentication
2. On failure, falls back to querying the database directly using `createServerComponentClient`
3. Returns a consistent JSON response including both instructions and code blocks
4. Provides fallback default instructions and empty code blocks if data is missing

**Response Format**:
```typescript
{
  instructions: Record<string, any>; // Installation instructions by platform
  code_blocks: Record<string, any>;  // Code blocks by platform
  platforms: string[];               // Available platforms (e.g., ["linux", "macos", "windows"])
  defaultPlatform: string;           // Default platform to show
}
```

**Error Handling**:
- Uses robust error handling with try/catch blocks
- Provides meaningful fallbacks for missing data
- Always returns a 200 response with consistent structure to prevent client-side failures

**Fallback Strategy**:
1. Edge function → Server component client → Direct Supabase client
2. Maintains type safety with proper interfaces
3. Uses optional chaining and nullish coalescing for safe data access
