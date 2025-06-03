/**
 * Tool types for the Server Details page
 * Part of the XOM-104 Smithery UI redesign
 */

export interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  enum?: any[];
  default?: any;
}

export interface Tool {
  name: string;
  description?: string;
  parameters?: ToolParameter[];
  example?: string;
  return_type?: string;
  success_rate?: number;
  average_response_time?: number;
  documentation_url?: string;
}
