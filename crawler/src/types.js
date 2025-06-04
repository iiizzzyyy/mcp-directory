/**
 * Type definitions for the MCP Directory database schema
 * 
 * This file defines the structure of the data we'll be storing in the database
 * based on the Smithery.ai server data model.
 */

/**
 * Server object matching the updated database schema
 * @typedef {Object} Server
 * @property {string} name - Server name
 * @property {string} slug - URL-friendly identifier
 * @property {string} owner - Owner/organization of the server
 * @property {string} description - Detailed description
 * @property {string} category - Server category/type
 * @property {string[]} tags - Array of relevant tags
 * @property {string} github_url - GitHub repository URL
 * @property {string} source_code_url - Source code URL (may be same as GitHub)
 * @property {string} homepage_url - Homepage URL
 * @property {number} stars - GitHub stars count
 * @property {number} forks - GitHub forks count
 * @property {number} open_issues - GitHub open issues count
 * @property {number} contributors - Number of contributors
 * @property {Object} contributors_list - List of contributors with details
 * @property {string} last_updated - Last updated timestamp
 * @property {number} monthly_tool_calls - Monthly tool call count
 * @property {number} success_rate - Success rate percentage
 * @property {number} average_response_time - Average response time in ms
 * @property {number} active_users - Number of active users
 * @property {number} tools_count - Number of tools provided
 * @property {string} readme_overview - Overview from README
 * @property {string} license - License type
 * @property {string} version - Version info
 * @property {string} deploy_branch - Deployment branch
 * @property {string} deploy_commit - Deployment commit
 * @property {Object} security_audit - Security audit information
 * @property {string} verification_status - Verification status
 * @property {Object} pricing_details - Pricing information
 * @property {boolean} is_local - Whether it's a local server
 * @property {string} published_date - Publication date
 * @property {Object} install_instructions - Installation instructions for different platforms
 * @property {Object} install_code_blocks - Code blocks for installation
 * @property {Object} example_code - Example code for different languages
 * @property {string} platform - Platform type
 * @property {string} source - Source of the server data
 * @property {string} health_check_url - URL for health checks
 * @property {string} icon_url - URL to the server icon
 */

/**
 * Server tool object
 * @typedef {Object} ServerTool
 * @property {string} server_id - ID of the parent server
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {Object[]} parameters - Tool parameters
 * @property {string} return_type - Return type of the tool
 * @property {string} example - Example usage
 * @property {boolean} is_active - Whether the tool is active
 */

/**
 * Server metrics object
 * @typedef {Object} ServerMetrics
 * @property {string} server_id - ID of the parent server
 * @property {number} monthly_tool_calls - Monthly tool call count
 * @property {number} success_rate - Success rate percentage
 * @property {number} average_response_time - Average response time in ms
 * @property {number} active_users - Number of active users
 */

/**
 * Health data object
 * @typedef {Object} HealthData
 * @property {string} server_id - ID of the parent server
 * @property {string} status - Server status (online, offline, etc.)
 * @property {string} verification_status - Verification status
 * @property {number} uptime_percentage - Uptime percentage
 * @property {number} response_time_ms - Response time in ms
 * @property {string} check_method - Method used for health check
 */

/**
 * Compatible client object
 * @typedef {Object} CompatibleClient
 * @property {string} server_id - ID of the parent server
 * @property {string} name - Client name
 * @property {string} icon_url - URL to client icon
 * @property {string} website_url - Client website
 * @property {number} priority - Display priority
 */

module.exports = {
  // These are just type definitions, not actual exports
};
