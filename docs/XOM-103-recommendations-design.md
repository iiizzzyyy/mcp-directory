# XOM-103: Server Recommendation Engine

## Overview
The Server Recommendation Engine provides intelligent MCP server suggestions to users based on multiple factors including server popularity, user interaction patterns, compatibility, and feature similarity. This enhances user discovery of relevant servers and improves the overall directory experience.

## Architecture

### Components

1. **Recommendation Algorithm**
   - Hybrid approach combining collaborative filtering and content-based filtering
   - Weighting system for different factors (popularity, similarity, compatibility)
   - Server similarity matrix generation

2. **Data Sources**
   - Server metrics (from metrics system)
   - User interaction data (from usage tracking)
   - Server metadata (tags, categories, features)
   - Compatibility information

3. **Edge Function**
   - `server-recommendations` endpoint
   - Authentication-aware (personalized if user is logged in)
   - Configurable recommendation criteria

4. **Frontend Components**
   - Recommendation card component
   - "Similar servers" section on server detail page
   - "Recommended for you" section on discover page

## Algorithm Design

The recommendation system will use a hybrid approach with the following components:

### Popularity Score
- Based on metrics data (views, installs, tool usage)
- Recent activity weighted more heavily
- Normalized across all servers

### User Affinity Score
- Based on user's interaction history
- Higher scores for servers similar to those the user has interacted with
- Only applies for authenticated users

### Similarity Score
- Content-based similarity using:
  - Tags (cosine similarity)
  - Categories (exact matches)
  - Features/capabilities (extracted from documentation)
  - Integrations offered

### Compatibility Score
- Compatibility with user's detected environment
- OS compatibility
- Runtime compatibility (Node.js, Python, etc.)

### Final Recommendation Score
The final recommendation score is a weighted combination:
```
score = (w1 * popularity) + (w2 * userAffinity) + (w3 * similarity) + (w4 * compatibility)
```

Where `w1`, `w2`, `w3`, and `w4` are configurable weights that sum to 1.

## Implementation Plan

### Phase 1: Core Algorithm
- Create PostgreSQL functions for:
  - Server similarity matrix calculation
  - User affinity calculation
  - Popularity score normalization
- Implement base recommendation query

### Phase 2: Edge Function
- Create `server-recommendations` edge function
- Implement personalization for logged-in users
- Add caching for performance optimization

### Phase 3: Frontend Integration
- Create recommendation card component
- Add similar servers section to server detail page
- Add recommended servers section to discover page
- Implement tracking of recommendation interactions

## API Specification

### GET /server-recommendations

**Query Parameters:**
- `context_server_id` (optional): Get recommendations similar to this server
- `limit` (optional): Number of recommendations to return (default: 5, max: 20)
- `categories` (optional): Filter by categories
- `tags` (optional): Filter by tags
- `excludeIds` (optional): Comma-separated server IDs to exclude

**Response:**
```json
{
  "recommendations": [
    {
      "id": "uuid",
      "name": "Server Name",
      "description": "Server description",
      "category": "API",
      "tags": ["tag1", "tag2"],
      "similarity_score": 0.92,
      "popularity": 85,
      "recommendation_factors": ["Similar to servers you've used", "Popular in your category"]
    }
  ],
  "recommendation_context": {
    "personalized": true,
    "based_on_server": "uuid or null",
    "filters_applied": {}
  }
}
```

## Testing Strategy
- Unit tests for score calculations
- Integration tests for recommendation system
- A/B testing for weight configuration
- Tracking of recommendation clickthrough rates
