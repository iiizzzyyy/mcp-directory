"use client";

import { useState, useEffect } from 'react';
import InstallBlock from './InstallBlock';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface InstallInstruction {
  platform: string;
  icon_url: string | null;
  install_command: string;
}

interface InstallationTabProps {
  serverId: string;
  defaultInstallCommand?: string;
}

export default function InstallationTab({ 
  serverId, 
  defaultInstallCommand 
}: InstallationTabProps) {
  const [instructions, setInstructions] = useState<InstallInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstructions = async () => {
      if (!serverId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/servers/${serverId}/install`
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
  }, [serverId]);

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
        
        {defaultInstallCommand && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Generic Installation</h3>
            <InstallBlock
              platform="Default"
              installCommand={defaultInstallCommand}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Installation Instructions</h2>
      {instructions.map((instruction, index) => (
        <InstallBlock
          key={index}
          platform={instruction.platform}
          icon={instruction.icon_url || undefined}
          installCommand={instruction.install_command}
        />
      ))}
    </div>
  );
}
