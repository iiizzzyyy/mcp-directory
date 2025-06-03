# MCP Directory Developer Guide

## Adding New Servers with Rich Content

This guide provides step-by-step instructions for adding new servers to the MCP Directory with rich README content and properly structured installation instructions.

## Table of Contents

1. [Server Data Structure](#server-data-structure)
2. [Rich README Content](#rich-readme-content)
3. [Installation Instructions](#installation-instructions)
4. [Code Blocks Format](#code-blocks-format)
5. [Testing Your Server](#testing-your-server)
6. [Troubleshooting](#troubleshooting)

## Server Data Structure

When adding a new server to the MCP Directory, ensure you populate these key fields:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| id | string | Unique identifier (usually the server's slug) | ✅ |
| name | string | Display name of the server | ✅ |
| description | string | Plain text description (used as fallback) | ✅ |
| readme_overview | string | HTML content for the Overview tab | ❌ |
| readme_last_updated | timestamp | When the README was last updated | ❌ |
| install_instructions | jsonb | Installation instructions by platform | ❌ |
| install_code_blocks | jsonb | Code blocks for installation by platform | ❌ |

### Example Basic Server Entry

```sql
INSERT INTO servers (id, name, description)
VALUES (
  'my-new-server',
  'My New Server',
  'A plain text description of what this server does and its key features.'
);
```

## Rich README Content

The `readme_overview` field supports HTML content for rich formatting. Here are guidelines for creating effective README content:

### HTML Structure

```html
<h1>Server Name</h1>
<p>Introduction paragraph explaining what the server does.</p>

<h2>Key Features</h2>
<ul>
  <li><strong>Feature 1</strong>: Description of feature 1</li>
  <li><strong>Feature 2</strong>: Description of feature 2</li>
</ul>

<h2>Usage Examples</h2>
<p>Brief explanation of how to use the server.</p>

<pre><code class="language-javascript">
// Example code snippet
const client = new MyServerClient();
const result = await client.performAction();
</code></pre>

<h2>Architecture</h2>
<p>Explanation of the server's architecture.</p>

<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Component 1</td>
      <td>Description of component 1</td>
    </tr>
    <tr>
      <td>Component 2</td>
      <td>Description of component 2</td>
    </tr>
  </tbody>
</table>
```

### Best Practices

1. **Keep the hierarchy logical**: Start with H1 for the title, then H2 for major sections, H3 for subsections
2. **Use semantic HTML**: Prefer `<strong>`, `<em>`, `<ul>`, `<ol>`, `<table>` for proper structure
3. **Code blocks**: Always use `<pre><code>` with appropriate language class for syntax highlighting
4. **Images**: Include `width` and `height` attributes and keep images under 800px wide
5. **Links**: Use absolute URLs for external resources

### Updating README Content

```sql
UPDATE servers
SET 
  readme_overview = '<h1>My Server</h1><p>Rich content here...</p>',
  readme_last_updated = CURRENT_TIMESTAMP
WHERE id = 'my-server-id';
```

## Installation Instructions

The `install_instructions` field uses a specific JSON structure organized by platform:

```json
{
  "linux": [
    {
      "title": "Install via npm",
      "description": "Install the server using npm package manager",
      "steps": [
        "Ensure you have Node.js installed",
        "Run the following command to install globally"
      ]
    }
  ],
  "macos": [
    {
      "title": "Install via Homebrew",
      "description": "Install using Homebrew package manager",
      "steps": [
        "Install Homebrew if not already installed",
        "Run the brew install command"
      ]
    }
  ],
  "windows": [
    {
      "title": "Install via npm",
      "description": "Install using npm on Windows",
      "steps": [
        "Ensure you have Node.js installed on Windows",
        "Open command prompt as administrator",
        "Run the npm install command"
      ]
    }
  ]
}
```

### Key Structure Requirements

1. Top-level keys must be platform identifiers (`linux`, `macos`, `windows`)
2. Each platform contains an array of installation methods
3. Each method needs `title`, `description`, and `steps` (array of instructions)

## Code Blocks Format

The `install_code_blocks` field uses a similar structure but contains code snippets for each step:

```json
{
  "linux": [
    {
      "method": "npm",
      "blocks": [
        {
          "language": "bash",
          "code": "node -v && npm -v"
        },
        {
          "language": "bash",
          "code": "npm install -g my-server"
        }
      ]
    }
  ],
  "macos": [
    {
      "method": "homebrew",
      "blocks": [
        {
          "language": "bash",
          "code": "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        },
        {
          "language": "bash",
          "code": "brew install my-server"
        }
      ]
    }
  ],
  "windows": [
    {
      "method": "npm",
      "blocks": [
        {
          "language": "powershell",
          "code": "node -v && npm -v"
        },
        {
          "language": "powershell",
          "code": "npm install -g my-server"
        }
      ]
    }
  ]
}
```

### Code Block Requirements

1. Match the `method` field to the corresponding title in `install_instructions`
2. Include appropriate `language` for syntax highlighting
3. Ensure code is properly escaped for JSON

## Testing Your Server

After adding a new server or updating content, follow these testing steps:

1. **Verify Overview Tab**:
   - Check that HTML renders correctly
   - Ensure all formatting (headings, lists, tables) displays properly
   - Test on both desktop and mobile viewports

2. **Verify Installation Tab**:
   - Check that all platform options are available
   - Verify each installation method displays correctly
   - Test copy functionality for code blocks
   - Ensure instructions match code blocks

3. **Check Edge Cases**:
   - Test with long content that requires scrolling
   - Verify responsive behavior on small screens
   - Check performance with complex HTML content

## Troubleshooting

### Common Issues and Solutions

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| README content not displaying | Invalid HTML in `readme_overview` | Validate HTML and fix syntax errors |
| Missing installation methods | Platform key not recognized | Ensure platform keys match expected values (`linux`, `macos`, `windows`) |
| Code blocks not highlighting | Incorrect language specified | Use standard language identifiers (`bash`, `javascript`, etc.) |
| Tables breaking on mobile | Complex table structure | Simplify tables or use responsive design patterns |
| Images not displaying | Incorrect image URLs | Use absolute URLs and verify image accessibility |

### Debugging Tips

1. Check browser console for JavaScript errors
2. Verify API responses using browser developer tools
3. Use the API endpoint directly to validate data format:
   ```
   GET /api/servers/[server-id]
   GET /api/servers/[server-id]/install
   ```

## Related Documentation

- [Server Detail Components](./server-detail-components.md): Technical details about the components
- [Server Data Flow](./server-data-flow.md): How data flows from the database to the UI

## Appendix: Complete Server Example

```sql
INSERT INTO servers (
  id, 
  name, 
  description,
  readme_overview,
  readme_last_updated,
  install_instructions,
  install_code_blocks
) VALUES (
  'example-server',
  'Example MCP Server',
  'A plain text description of the Example MCP Server.',
  '<h1>Example MCP Server</h1><p>This server provides example functionality...</p>',
  CURRENT_TIMESTAMP,
  '{"linux":[{"title":"Install via npm","description":"Install using npm","steps":["Check Node.js version","Run npm install"]}]}',
  '{"linux":[{"method":"npm","blocks":[{"language":"bash","code":"node -v"},{"language":"bash","code":"npm install -g example-server"}]}]}'
);
```
