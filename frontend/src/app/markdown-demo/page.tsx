"use client";

import React, { useState } from 'react';
import { MarkdownArticle } from '@/components/markdown/markdown-article';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Demo page for the Markdown Article component
 * Shows both a live editor and examples of rendered markdown
 */
export default function MarkdownDemoPage() {
  const [markdown, setMarkdown] = useState<string>(
`# Markdown Article Demo

This is a demonstration of the markdown article component with anchored headings and code formatting.

## Features

- **Anchored Headings**: Hover over any heading to see and click the anchor link
- **Code Formatting**: Syntax highlighting for code blocks
- **Copy Button**: Hover over code blocks to see the copy button
- **Typography**: Consistent typography with proper spacing

### Heading Levels

#### Level 4 Heading

##### Level 5 Heading

## Code Examples

Inline code looks like \`const x = 42\`.

\`\`\`javascript
// This is a JavaScript code block
function greet(name) {
  return \`Hello, \${name}!\`;
}

const result = greet('World');
console.log(result);
\`\`\`

\`\`\`python
# This is a Python code block
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(5)
print(f"5! = {result}")
\`\`\`

## Lists and Tables

### Unordered List
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item

### Table Example

| Name | Type | Description |
|------|------|-------------|
| id | string | Unique identifier |
| title | string | The title of the document |
| content | string | The markdown content |
| author | string | The author's name |

## Blockquotes

> This is a blockquote.
> 
> It can span multiple lines.

## Links

[Internal link](#features)

[External link](https://example.com)

## Images

Images are also supported (placeholder example):

![Placeholder image](https://via.placeholder.com/600x300)
`
  );

  // Example markdown for demo tabs
  const documentationExample = `# MCP Server API Documentation

## Getting Started

This guide will help you integrate the MCP server into your application.

### Installation

First, install the package:

\`\`\`bash
npm install my-mcp-server
\`\`\`

### Basic Usage

Here's how to create a client and call an API method:

\`\`\`javascript
import { MCPClient } from 'my-mcp-server';

const client = new MCPClient({
  apiKey: 'YOUR_API_KEY',
  endpoint: 'https://api.example.com/v1'
});

async function main() {
  const result = await client.search('weather in New York');
  console.log(result);
}

main().catch(console.error);
\`\`\`

## API Reference

### MCPClient(config)

Creates a new MCP client instance.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| config.apiKey | string | Your API key |
| config.endpoint | string | API endpoint URL |
| config.timeout | number | Request timeout in ms (default: 30000) |

### client.search(query)

Performs a search using the MCP server.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| query | string | The search query |

**Returns:**

A Promise that resolves to the search results.

## Error Handling

The client will throw errors for various conditions:

\`\`\`javascript
try {
  const result = await client.search('example');
} catch (error) {
  if (error.code === 'auth_error') {
    // Handle authentication errors
  } else if (error.code === 'rate_limit') {
    // Handle rate limiting
  } else {
    // Handle other errors
  }
}
\`\`\`

> **Note:** Always implement proper error handling in your application.
`;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Markdown Article Demo</h1>
      <p className="text-muted-foreground mb-8">
        Demonstration of markdown rendering with anchored headings and code formatting
      </p>
      
      <Tabs defaultValue="editor" className="w-full">
        <TabsList>
          <TabsTrigger value="editor">Live Editor</TabsTrigger>
          <TabsTrigger value="documentation">Documentation Example</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Editor</h2>
              <Textarea
                className="font-mono h-[500px] resize-none"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(markdown)}
                >
                  Copy Markdown
                </Button>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              <Card className="border rounded-lg overflow-hidden">
                <CardContent className="p-6">
                  <MarkdownArticle content={markdown} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="documentation" className="mt-6">
          <Card className="border rounded-lg overflow-hidden">
            <CardContent className="p-6">
              <MarkdownArticle content={documentationExample} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
