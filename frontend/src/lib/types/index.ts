/**
 * Server types based on the API client but adapted for App Router architecture
 */
export type HealthStatus = 'online' | 'offline' | 'degraded' | 'unknown';
export type ServerStatus = 'active' | 'inactive' | 'deprecated' | 'beta';
export type VerificationStatus = 'verified' | 'unknown' | 'caution';

// Server type definition that's compatible with API client
export interface Server {
  id: string;
  name: string;
  description?: string;
  url?: string;
  icon?: string;
  stars?: number | null;
  status?: ServerStatus;
  health_status?: HealthStatus;
  slug?: string | null;
  created_at?: string;
  updated_at?: string;
  authors?: string[];
  last_checked?: string;
  
  // URLs
  github_url?: string;
  documentation_url?: string;
  changelog_url?: string;
  homepage_url?: string;
  icon_url?: string;
  
  // Installation and setup
  install_command?: string;
  setup_instructions?: string;
  install_instructions?: string | Record<string, any>; // String or JSONB with platform-specific instructions
  install_code_blocks?: Record<string, any>; // Code blocks for different installation methods
  client_install_instructions?: Record<string, any>; // Client-specific installation instructions
  
  // Content fields
  readme_overview?: string; // Rich HTML content from repository README
  readme_last_updated?: string; // Timestamp for when README was last parsed
  tools?: any[]; // Array of tool objects
  compatibility?: any[];
  health_history?: any[];
  changelog?: any[];
  
  // Repository metadata
  owner?: string; // Repository owner or organization
  forks?: number;
  open_issues?: number;
  contributors?: number;
  license?: string;
  version?: string;
  last_updated?: string;
  verification_status?: VerificationStatus;
  
  // Server metrics (added as part of XOM-104 Smithery redesign)
  monthly_tool_calls?: number;
  success_rate?: number;
  average_response_time?: number;
  security_audit?: boolean;
  active_users?: number;
}

// Component Props Types
export interface ServerInstallProps {
  serverId: string;
  serverName?: string;
  defaultInstallCommand?: string;
}

export interface ServerToolsProps {
  serverId: string;
  serverName: string;
}

export interface ServerCompatibilityProps {
  serverId: string;
}

export interface ServerHealthProps {
  serverId: string;
}

export interface ApiTabProps {
  serverId: string;
}

export interface ServerChangelogProps {
  serverId: string;
}

export interface ServerDocumentationProps {
  serverId: string;
}
