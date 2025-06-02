// Server type definition
export interface Server {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  platform?: string;
  install_method?: string;
  stars?: number;
  health_status?: 'online' | 'offline' | 'degraded' | 'unknown';
  last_checked?: string;
  github_url?: string;
  documentation_url?: string;
  changelog_url?: string;
  homepage_url?: string;
  icon_url?: string;
  slug?: string;
  // Additional fields for detail page
  install_command?: string;
  setup_instructions?: string;
  compatibility?: any[];
  health_history?: any[];
  changelog?: any[];
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
