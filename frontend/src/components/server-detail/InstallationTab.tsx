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
  
  const languages = [
    { id: 'bash', name: 'Bash/Shell' },
    { id: 'powershell', name: 'PowerShell' },
    { id: 'javascript', name: 'JavaScript/Node' },
    { id: 'python', name: 'Python' }
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

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Installation Instructions</h2>
        <p className="text-gray-600 mt-1">
          Install {server?.name || "this MCP server"} on your preferred platform
        </p>
      </div>

      <div className="w-full md:w-64 mb-6">
        <label className="text-sm text-gray-600 mb-2 block">
          Select Language / Platform
        </label>
        <LanguageSelector
          languages={languages}
          selectedLanguage={selectedLanguage}
          onLanguageChange={(langId) => setSelectedLanguage(langId)}
          className="w-full"
        />
      </div>

      <div className="space-y-8">
        {instructions.map((instruction, index) => (
          <InstallBlock
            key={index}
            platform={instruction.platform}
            icon={instruction.icon_url || undefined}
            installCommand={instruction.install_command}
            additionalSteps={instruction.additional_steps || undefined}
            requirements={instruction.requirements || undefined}
            className="border-gray-200"
          />
        ))}
      </div>
    </div>
  );
}
