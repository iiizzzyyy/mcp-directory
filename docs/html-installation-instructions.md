# HTML Installation Instructions Support

## Overview

This document describes the implementation of HTML content support in server installation instructions. This feature allows rich HTML content to be displayed in the installation tab, providing more flexibility for complex installation documentation.

## Problem Solved

Some MCP servers (like Activepieces) have installation instructions stored as rich HTML content rather than the structured JSON format expected by the frontend components. This implementation provides backward compatibility while adding support for HTML content.

## Implementation Details

### 1. Edge Function Update

The `servers-install` edge function has been enhanced to:

- Detect HTML content in the `install_instructions` field using tag detection
- Create a special format with an `all` platform when HTML content is detected
- Automatically prioritize the `all` platform in the UI when available

```typescript
function isHtmlContent(str: string): boolean {
  // Checks for common HTML tags
}

function createHtmlInstructionFormat(htmlContent: string) {
  return {
    all: htmlContent,
    linux: "See the 'All Platforms' tab for detailed installation instructions.",
    macos: "See the 'All Platforms' tab for detailed installation instructions.",
    windows: "See the 'All Platforms' tab for detailed installation instructions."
  };
}
```

### 2. New Component: HtmlInstallBlock

A new component `HtmlInstallBlock.tsx` has been created to safely render HTML content:

- Uses `dangerouslySetInnerHTML` with proper styling and structure
- Includes a copy button that strips HTML tags when copying to clipboard
- Maintains the same UI structure as the regular InstallBlock component

### 3. ClientInstallationTab Updates

The `ClientInstallationTab` component has been updated to:

- Accept and process both regular installation instructions and HTML content
- Add an "All Platforms" option to the language selector when HTML content is available
- Switch between showing regular installation commands and HTML content based on selection

### 4. ServerInstall Component Updates

The `ServerInstall` server component has been updated to:

- Process the edge function response which may now include an `instructions` object with an `all` platform
- Convert the instructions to the expected array format for backward compatibility
- Pass HTML content separately to the ClientInstallationTab component

## Testing

A test file `HtmlInstallBlock.test.tsx` has been added to ensure:

- HTML content is rendered correctly
- Copy functionality works as expected (stripping HTML tags)
- Component handles all required props appropriately

## Deployment Requirements

To fully implement this feature:

1. Deploy the updated edge function to Supabase:
   ```bash
   cd /path/to/project/supabase
   npx supabase functions deploy servers-install
   ```

2. Deploy the frontend changes which include:
   - New `HtmlInstallBlock.tsx` component
   - Updated `ClientInstallationTab.tsx` and `ServerInstall.tsx` components

## Data Migration Notes

While the system now handles HTML content correctly, it's recommended to consider standardizing the format of installation instructions in the database. Options include:

1. Keep using HTML content for complex instructions where rich formatting is required
2. Convert HTML content to structured JSON for consistency across all servers
3. Use a hybrid approach where simple instructions use JSON and complex ones use HTML

## Example Response Format

The updated edge function response format when HTML content is detected:

```json
{
  "success": true,
  "instructions": {
    "all": "<h1>Installation Instructions</h1>...",
    "linux": "See the 'All Platforms' tab for detailed installation instructions.",
    "macos": "See the 'All Platforms' tab for detailed installation instructions.",
    "windows": "See the 'All Platforms' tab for detailed installation instructions."
  },
  "platforms": ["all", "linux", "macos", "windows"],
  "defaultPlatform": "all",
  "codeBlocks": {}
}
```
