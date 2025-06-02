# GitHub Token Setup for MCP Directory

This document explains how to set up a GitHub token for the MCP Directory tool detection system.

## Why a GitHub Token is Needed

The MCP Directory uses a tiered approach to detect tools from MCP servers:

1. **Tier 1**: Standard MCP API endpoint detection
2. **Tier 2**: Alternative API endpoints detection
3. **Tier 3**: GitHub repository code analysis fallback

For Tier 3, we need a valid GitHub token to access repository contents and detect MCP tools from code.

## Creating a GitHub Token

1. Go to your GitHub account settings: https://github.com/settings/tokens
2. Click on "Generate new token" > "Generate new token (classic)"
3. Give your token a descriptive name, e.g., "MCP Directory Tool Detection"
4. Select the following scopes:
   - `public_repo` - to access public repositories
   - `read:packages` - to read package information
5. Click "Generate token"
6. **IMPORTANT**: Copy the token immediately as you won't be able to see it again

## Configuring the GitHub Token

### For Local Development

Add the token to your `.env` file:

```
GITHUB_TOKEN=your_github_token
```

### For Production (Supabase)

1. Go to your Supabase project dashboard
2. Navigate to Settings > API > Edge Functions
3. Add the environment variable:
   - Name: `GITHUB_TOKEN`
   - Value: your GitHub token

## Security Considerations

- Use a token with minimal required permissions (read-only access to public repos)
- Never commit the token to version control
- Consider creating a dedicated GitHub account just for this purpose in production
- Regularly rotate the token (at least every 90 days)
- Store the token securely in Supabase environment variables

## Testing the GitHub Token

You can test if your GitHub token is working correctly by running:

```bash
npm run test:github-detection
```

This script will validate:
1. If the token is set
2. If it can authenticate with GitHub
3. If it can access repository contents
4. If it can detect MCP tools in repositories

## Troubleshooting

If you encounter issues:

1. **Authentication failure**: Your token may be invalid or expired. Generate a new one.
2. **Rate limiting**: GitHub has API rate limits. Check your rate limit status with `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit`
3. **Permission errors**: Ensure your token has the correct scopes
