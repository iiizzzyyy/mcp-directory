/**
 * This script simulates creating Linear tickets for our tasks
 */
console.log(`
TICKET 1:
Title: Add tools JSONB column to servers table

Description:
## Background
Currently, tools data is stored only in tags, which limits the amount and richness of data we can store and display.

## Requirements
- Create a migration to add a 'tools' JSONB column to the servers table
- Update database schema documentation
- Ensure RLS policies are properly configured for the new column

## Acceptance Criteria
- Migration script successfully adds the column
- Column defaults to an empty JSON array
- Column can be queried through the existing API endpoints
- RLS policies match the servers table policies (public read access)

---

TICKET 2:
Title: Update GitHub tools detector to store complete tool definitions

Description:
## Background
The current GitHub tools detector only stores tool names as tags, without detailed information about parameters, descriptions, etc.

## Requirements
- Update the GitHub tools detector to extract complete tool definitions
- Store full tool definitions in the new 'tools' JSONB column
- Continue using tags for searchability (keep existing functionality)
- Improve tool extraction logic for various file formats

## Acceptance Criteria
- Script successfully extracts and stores complete tool definitions
- Extracted data includes name, description, parameters where available
- Server tags continue to be updated for search functionality
- Existing last_tools_scan tracking functionality is preserved

---

TICKET 3:
Title: Enhance GitHub tools detector to extract installation instructions

Description:
## Background
Our server database would benefit from automatically extracted installation instructions for different platforms.

## Requirements
- Enhance the GitHub tools detector to look for installation patterns
- Extract instructions from README.md, package.json, setup.py, and Docker files
- Parse instructions for different platforms (npm, pip, Docker, etc.)
- Store extracted instructions in the server_install_instructions table

## Acceptance Criteria
- Script successfully identifies installation sections in README files
- Extracts platform-specific commands (npm, pip, Docker, etc.)
- Properly formats and stores commands in the server_install_instructions table
- Handles common variations in installation documentation formats

---

TICKET 4:
Title: Implement Firecrawl integration for enhanced documentation extraction

Description:
## Background
Firecrawl MCP offers advanced capabilities for structured data extraction that could improve our installation and tool detection.

## Requirements
- Create a dedicated script using Firecrawl MCP to crawl documentation
- Define a custom schema for extracting tool and installation information
- Process documentation pages to extract structured data
- Integrate with existing database storage

## Acceptance Criteria
- Successfully extracts structured data from documentation sites
- Properly handles different documentation formats
- Integration with existing server data via server ID matching
- Performance meets requirements (crawling completes within reasonable time)
`);
