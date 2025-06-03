"use client";

import { useState, useEffect } from 'react';
import InstallBlock from './InstallBlock';
import LanguageSelector from './LanguageSelector';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface InstallInstruction {
  platform: string;
  icon_url: string | null;
  install_command: string;
  additional_steps?: string | null;
  requirements?: string | null;
  format?: string;
  environment?: string;
  is_recommended?: boolean;
  requires_api_key?: boolean;
}

interface InstallationTabProps {
  serverId?: string;
  defaultInstallCommand?: string;
  server?: {
    id: string;
    name: string;
    install_command?: string;
  };
}

export default function InstallationTab({ 
  serverId, 
  defaultInstallCommand,
  server
}: InstallationTabProps) {
  // Handle both cases: when serverId is directly provided or when server object is provided
  const effectiveServerId = serverId || server?.id;
  const effectiveDefaultCommand = defaultInstallCommand || server?.install_command;
  const [instructions, setInstructions] = useState<InstallInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('bash');
  
  // Enhanced language options with icons
  const languages = [
    { 
      id: 'bash', 
      name: 'Bash/Shell',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bash/bash-original.svg'
    },
    { 
      id: 'powershell', 
      name: 'PowerShell',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/windows8/windows8-original.svg'
    },
    { 
      id: 'javascript', 
      name: 'JavaScript/Node',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg'
    },
    { 
      id: 'python', 
      name: 'Python',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg'
    },
    { 
      id: 'ruby', 
      name: 'Ruby',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg'
    },
    { 
      id: 'go', 
      name: 'Go',
      icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg'
    }
  ];

  useEffect(() => {
    const fetchInstructions = async () => {
      if (!effectiveServerId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/servers-install?id=${effectiveServerId}`
        );
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        setInstructions(result.data || []);
      } catch (err) {
        console.error('Failed to fetch installation instructions:', err);
        setError('Unable to load installation instructions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInstructions();
  }, [effectiveServerId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-12 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (instructions.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-gray-600">
          No specific installation instructions available for this server.
        </p>
        
        {effectiveDefaultCommand && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Generic Installation</h3>
            <InstallBlock
              platform="Default"
              installCommand={effectiveDefaultCommand}
            />
          </div>
        )}
      </div>
    );
  }

  // Group installations by environment for better organization
  const groupedInstructions = instructions.reduce((acc, instruction) => {
    const env = instruction.environment || 'default';
    if (!acc[env]) acc[env] = [];
    acc[env].push(instruction);
    return acc;
  }, {} as Record<string, InstallInstruction[]>);

  // Sort environments by importance
  const sortedEnvironments = Object.keys(groupedInstructions).sort((a, b) => {
    // Priority order: vscode, claude, default, others
    const order: Record<string, number> = {
      'vscode': 1,
      'claude': 2,
      'default': 3
    };
    return (order[a] || 99) - (order[b] || 99);
  });

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Installation Instructions</h2>
        <p className="text-muted-foreground mt-1">
          Install {server?.name || "this MCP server"} on your preferred platform
        </p>
      </div>

      <div className="w-full md:w-72 mb-8">
        <label className="text-sm font-medium mb-2 block">
          Select Language / Platform
        </label>
        <div className="mb-5">
          <LanguageSelector
            languages={languages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            persistKey={`server_${effectiveServerId}`} // Use server ID for persistence key
            className="w-full"
          />
        </div>
      </div>

      {/* Installation sections by environment */}
      {sortedEnvironments.map((env) => (
        <div key={env} className="space-y-6">
          {env !== 'default' && (
            <h3 className="text-lg font-medium border-b pb-2 capitalize">{env} Installation</h3>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {groupedInstructions[env].map((instruction, index) => (
              <InstallBlock
                key={index}
                platform={instruction.platform}
                icon={instruction.icon_url || undefined}
                installCommand={instruction.install_command}
                additionalSteps={instruction.additional_steps || undefined}
                requirements={instruction.requirements || undefined}
                format={(instruction.format as any) || 'auto'}
                environment={(instruction.environment as any) || 'custom'}
                isRecommended={instruction.is_recommended || false}
                apiKey={instruction.requires_api_key ? "required" : undefined}
              />
            ))}
          </div>
        </div>
      ))}
      
      {instructions.length === 0 && effectiveDefaultCommand && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Generic Installation</h3>
          <InstallBlock
            platform="Default"
            installCommand={effectiveDefaultCommand}
            format="auto"
            isRecommended={true}
          />
        </div>
      )}
    </div>
  );
}
