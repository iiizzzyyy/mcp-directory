# DEPRECATED: Netlify Function API Handlers

The following files in this directory are deprecated and should not be used:
- `api.js` - Replaced by Next.js API routes
- `nextjs-api.js` - Replaced by Next.js API routes

## Migration Notes
- All API endpoints have been consolidated to use Next.js API routes exclusively
- The Netlify configuration has been updated to route `/api/*` requests to the Next.js handler
- See the updated configuration in `netlify.toml`

**DO NOT MODIFY THESE FILES** - They are kept for reference only and will be removed in a future update.
