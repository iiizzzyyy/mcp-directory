/**
 * Server types based on the API client but adapted for App Router architecture
 */
export type HealthStatus = 'online' | 'offline' | 'degraded' | 'unknown';

// Server type definition that's compatible with API client
export interface Server {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  platform: string | null;
  install_method: string | null;
  stars: number | null;
  health_status?: HealthStatus;
  last_checked?: string;
  github_url?: string;
  documentation_url?: string;
  changelog_url?: string;
  homepage_url?: string;
  icon_url?: string;
  slug?: string | null;
  // Additional fields for detail page
  install_command?: string;
  setup_instructions?: string;
  compatibility?: any[];
  health_history?: any[];
  changelog?: any[];
  // Database schema fields
  readme_overview?: string; // Rich HTML content from repository README
  readme_last_updated?: string; // Timestamp for when README was last parsed
  install_instructions?: Record<string, any>; // JSONB with platform-specific installation instructions
  install_code_blocks?: Record<string, any>; // JSONB with code blocks for different installation methods
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
