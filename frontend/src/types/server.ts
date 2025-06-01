export interface Server {
  id: string;
  name: string;
  description: string;
  category: string;
  github_url?: string;
  stars?: number;
  forks?: number;
  issues?: number;
  status?: 'online' | 'degraded' | 'offline' | 'maintenance';
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface HealthEntry {
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  last_check_time: string;
  response_time_ms?: number;
  error_message?: string;
}

export interface CompatibilityItem {
  platform: string;
  status: 'compatible' | 'partial' | 'incompatible';
  version?: string;
  notes?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export interface InstallInstruction {
  platform: string;
  icon_url?: string;
  install_command: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  params?: Record<string, string>;
  category?: string;
  requires_auth?: boolean;
}
