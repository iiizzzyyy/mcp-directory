"use client";

import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownArticle } from '@/components/markdown/markdown-article';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface DocumentationSectionProps {
  serverId: string;
}

// Mock documentation data for static export
const mockApiDocs: Record<string, string> = {
  'pulse-auth-mcp': `
# Pulse Auth MCP API Documentation

## Introduction
Pulse Auth MCP is an authentication and authorization server for the Model Context Protocol. It provides secure access control mechanisms for MCP-based applications.

## Getting Started

Install the package:

\`\`\`bash
npm install pulse-auth-mcp
\`\`\`

Basic setup:

\`\`\`javascript
import { createAuthClient } from 'pulse-auth-mcp';

const authClient = createAuthClient({
  apiKey: 'your-api-key',
  endpoint: 'https://your-auth-endpoint.com',
});

// Authenticate a user
const session = await authClient.signIn({
  email: 'user@example.com',
  password: 'secure-password'
});
\`\`\`

## Core Concepts

### Authentication Flow
Pulse Auth MCP supports multiple authentication flows:
- Password-based authentication
- OAuth 2.1 (including support for various identity providers)
- API key authentication for server-to-server communications
- Multi-factor authentication

### Role-Based Access Control
Define and manage roles and permissions for fine-grained access control to your MCP resources.

## API Reference

### Authentication Methods

#### signIn(credentials)
Authenticates a user with email/password.

#### signInWithProvider(provider)
Authenticates using an OAuth provider.

#### signOut()
Ends the current session.

### User Management

#### createUser(userData)
Creates a new user account.

#### updateUser(userId, userData)
Updates user information.

#### deleteUser(userId)
Deletes a user account.

## Security Recommendations

- Always use HTTPS
- Implement proper token rotation
- Use refresh tokens with limited lifetimes
- Validate all user inputs
  `,
  'pulse-vector-db': `
# Pulse Vector DB API Documentation

## Introduction
Pulse Vector DB is a vector database server for MCP applications with powerful semantic search capabilities.

## Installation

\`\`\`bash
pip install pulse-vector-mcp
\`\`\`

## Quick Start

\`\`\`python
from pulse_vector_db import VectorClient

# Initialize client
client = VectorClient(
    api_key="your-api-key",
    endpoint="https://your-vector-endpoint.com"
)

# Create a collection
client.create_collection("documents", dimension=1536)

# Add vectors
client.upsert("documents", [
    {"id": "doc1", "values": [0.1, 0.2, ...], "metadata": {"text": "Sample document"}},
    {"id": "doc2", "values": [0.3, 0.4, ...], "metadata": {"text": "Another example"}}
])

# Search
results = client.search("documents", query_vector=[0.2, 0.3, ...], top_k=5)
\`\`\`

## Core Features

### Collections
Organize your vectors into collections for better management.

### Vector Operations
- Insert/update vectors with metadata
- Batch operations for efficiency
- Vector deletion and updates

### Search Capabilities
- K-nearest neighbors search
- Filtered search based on metadata
- Hybrid search (combining vector similarity with keyword matching)

## Advanced Usage

### Indexing Options

Pulse Vector DB supports multiple indexing algorithms:
- HNSW (Hierarchical Navigable Small World)
- Flat (brute force, exact search)
- IVF (Inverted File Index)

Customize your index for the right balance of speed and accuracy:

\`\`\`python
client.create_collection(
    "optimized_docs",
    dimension=1536,
    index_type="hnsw",
    index_params={
        "M": 16,
        "efConstruction": 200
    }
)
\`\`\`
  `,
  'pulse-speech-mcp': `
# Pulse Speech MCP API Documentation

## Introduction
Pulse Speech MCP is a speech recognition and synthesis server for the Model Context Protocol.

## Installation

\`\`\`bash
pip install pulse-speech-mcp
\`\`\`

## Quick Start Guide

### Speech Recognition

\`\`\`python
from pulse_speech import SpeechClient

# Initialize the client
client = SpeechClient(api_key="your-api-key")

# Transcribe audio from a file
with open("audio.wav", "rb") as audio_file:
    transcript = client.transcribe(
        audio=audio_file,
        model="standard",  # Options: standard, enhanced, conference
        language="en"     # ISO language code
    )

print(f"Transcription: {transcript.text}")

# Stream audio for real-time transcription
for chunk in microphone_stream():
    result = client.stream_transcribe(chunk)
    if result.is_final:
        print(f"Final: {result.text}")
    else:
        print(f"Interim: {result.text}", end="\\r")
\`\`\`

### Text to Speech

\`\`\`python
# Generate speech from text
audio_bytes = client.synthesize(
    text="Hello, welcome to the Pulse Speech MCP demonstration.",
    voice="lisa",     # Available voices: lisa, michael, james, sarah, etc.
    format="wav"      # Output format: wav, mp3, ogg
)

# Save to file
with open("output.wav", "wb") as f:
    f.write(audio_bytes)

# Stream synthesis for low-latency applications
for text_chunk in dialogue_generator():
    audio_chunk = client.stream_synthesize(text_chunk, voice="lisa")
    audio_player.play(audio_chunk)
\`\`\`

## Supported Languages

Pulse Speech MCP supports over 30 languages for speech recognition and 20 languages for speech synthesis.

## Voice Customization

Create custom voices by providing training samples:

\`\`\`python
custom_voice = client.create_voice(
    name="company-assistant",
    training_files=["sample1.wav", "sample2.wav", "sample3.wav"],
    description="Company customer service voice"
)
\`\`\`
  `,
  'pulse-translation-mcp': `
# Pulse Translation MCP API Documentation

## Introduction
Pulse Translation MCP is a translation server for the Model Context Protocol with support for over 100 languages.

## Installation

\`\`\`bash
pip install pulse-translation-mcp
\`\`\`

For Go:
\`\`\`bash
go get github.com/pulsemcp/translation-go-client
\`\`\`

## Quick Start

### Python Example

\`\`\`python
from pulse_translation import TranslationClient

# Initialize client
translator = TranslationClient(api_key="your-api-key")

# Simple translation
result = translator.translate(
    text="Hello, how are you today?",
    source_language="en",
    target_language="fr"
)
print(result.translated_text)  # "Bonjour, comment allez-vous aujourd'hui?"

# Batch translation
texts = [
    "The weather is nice today.",
    "I would like to book a table for dinner."
]
results = translator.batch_translate(
    texts=texts,
    source_language="en",
    target_language="es"
)
for result in results:
    print(result.translated_text)
\`\`\`

### Go Example

\`\`\`go
package main

import (
    "fmt"
    "log"
    "github.com/pulsemcp/translation-go-client"
)

func main() {
    client := translation.NewClient("your-api-key")
    
    result, err := client.Translate(
        "Hello world",
        "en",
        "ja",
        nil, // Optional parameters
    )
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Println(result.TranslatedText)
}
\`\`\`

## Advanced Features

### Domain-Specific Translation

Specify the domain for better translation quality:

\`\`\`python
translator.translate(
    text="The patient shows signs of improved cardiac function.",
    source_language="en",
    target_language="de",
    domain="medical"  # Options: general, technical, medical, legal, etc.
)
\`\`\`

### Document Translation

Translate entire documents while preserving formatting:

\`\`\`python
with open("document.docx", "rb") as doc:
    translated_doc = translator.translate_document(
        document=doc,
        source_language="en",
        target_language="zh",
        preserve_formatting=True
    )
    
    with open("translated_document.docx", "wb") as output:
        output.write(translated_doc)
\`\`\`

### Terminology Management

Enforce consistent translations for specific terms:

\`\`\`python
glossary = {
    "MCP": {"fr": "PCM", "es": "PCM", "de": "MKP"},
    "neural network": {"fr": "réseau neuronal", "de": "neuronales Netzwerk"}
}

translator.translate(
    text="The MCP uses advanced neural networks for processing.",
    source_language="en",
    target_language="fr",
    glossary=glossary
)
\`\`\`
  `,
  'brave-search-mcp': `
# Brave Search MCP API Documentation

## Introduction
Brave Search MCP is a web search connector for Brave Search API with RAG capabilities.

## Installation

\`\`\`bash
npm install brave-search-mcp
\`\`\`

## Quick Start

\`\`\`javascript
import { BraveSearchClient } from 'brave-search-mcp';

// Initialize the client
const searchClient = new BraveSearchClient({
  apiKey: 'your-api-key'
});

// Perform a basic search
const results = await searchClient.search({
  query: 'climate change solutions',
  count: 10
});

console.log(results.webPages.value);

// Web search with filtering
const filteredResults = await searchClient.search({
  query: 'electric vehicles',
  count: 20,
  freshness: 'Week',  // Filter to recent results
  textDecorations: true,
  textFormat: 'HTML'
});

// News search
const newsResults = await searchClient.newsSearch({
  query: 'latest tech innovations',
  count: 10,
  market: 'en-US',
  sortBy: 'Date'
});

// Image search
const imageResults = await searchClient.imageSearch({
  query: 'renewable energy technologies',
  count: 50,
  license: 'Public'
});
\`\`\`

## Advanced Features

### RAG (Retrieval-Augmented Generation)

The Brave Search MCP client includes built-in support for RAG workflows:

\`\`\`javascript
// Perform a RAG-optimized search
const ragResults = await searchClient.ragSearch({
  query: 'How do electric vehicles impact the environment?',
  count: 15,
  snippetLength: 'long',
  extractionFormat: 'markdown'
});

// Extract relevant passages from search results
const passages = ragResults.passages;

// These passages can be directly used with LLM context windows
console.log(passages);
\`\`\`

### Answer Generation

Get AI-generated answers based on search results:

\`\`\`javascript
const answer = await searchClient.generateAnswer({
  query: 'What causes northern lights?',
  maxTokens: 200,
  temperature: 0.7
});

console.log(answer.text);
console.log(answer.citations); // Source citations
\`\`\`

### Custom Search Filters

\`\`\`javascript
const results = await searchClient.search({
  query: 'healthy recipes',
  filters: {
    site: 'cooking.nytimes.com',
    fileType: 'pdf',
    language: 'en',
    region: 'us'
  }
});
\`\`\`
  `
};

/**
 * Component for displaying auto-generated API documentation
 * Uses mock data for static export to avoid authentication issues
 * 
 * @param props Component properties
 * @returns Documentation section component
 */
export default function StaticDocumentationSection({ serverId }: DocumentationSectionProps) {
  const [docContent, setDocContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulate loading for a more realistic experience
    const timer = setTimeout(() => {
      // Use mock data based on server ID or generate a fallback
      if (serverId in mockApiDocs) {
        setDocContent(mockApiDocs[serverId]);
      } else {
        // Generate fallback documentation for unknown servers
        const fallbackDocs = `
# ${serverId} API Documentation

## Getting Started

To use this MCP server, install it in your project:

\`\`\`bash
npm install ${serverId}
# or
pip install ${serverId}
\`\`\`

## Basic Usage

\`\`\`javascript
import { createClient } from '${serverId}';

const client = createClient({
  // Your configuration options
});

// Now you can use the client to make API calls
\`\`\`

> **Note:** Full API documentation is being generated. Please check back later.
        `;
        
        setDocContent(fallbackDocs);
      }
      
      setIsLoading(false);
    }, 800); // Short delay to simulate loading
    
    return () => clearTimeout(timer);
  }, [serverId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-6">
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // Check if documentation is available
  const isDocumentationAvailable = docContent && docContent.trim().length > 0;

  if (!isDocumentationAvailable) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Documentation Unavailable</AlertTitle>
        <AlertDescription>
          Documentation for this MCP server is currently not available. Please check back later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="documentation-container">
      <MarkdownArticle 
        content={docContent}
        title="API Documentation"
      />
    </div>
  );
}
