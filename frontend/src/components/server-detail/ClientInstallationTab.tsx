"use client";

import { useState, useEffect } from 'react';
import InstallBlock from './InstallBlock';
import HtmlInstallBlock from './HtmlInstallBlock';
import LanguageSelector from './LanguageSelector';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InstallInstruction {
  platform: string;
  icon_url?: string | null;
  install_command: string;
  additional_steps?: string | null;
  requirements?: string | null;
  html_content?: string; // New field for HTML content
}

interface ClientInstallationTabProps {
  serverId: string;
  serverName?: string;
  defaultInstallCommand?: string;
  instructions: InstallInstruction[];
  htmlInstructions?: Record<string, string>; // Platform to HTML content mapping
}

/**
 * Client component that handles the interactive UI elements for installation
 * Works with the ServerInstall component which fetches the data server-side
 * Supports both standard installation commands and HTML content
 */
export default function ClientInstallationTab({ 
  serverId, 
  serverName,
  defaultInstallCommand,
  instructions,
  htmlInstructions = {}
}: ClientInstallationTabProps) {
  // Start with 'all' platform if available, otherwise default to bash
  const [selectedLanguage, setSelectedLanguage] = useState(htmlInstructions?.all ? 'all' : 'bash');
  
  // Keep track of whether we're displaying HTML content
  const [hasHtmlContent, setHasHtmlContent] = useState(false);
  
  // Check for HTML content
  useEffect(() => {
    setHasHtmlContent(!!htmlInstructions?.all);
  }, [htmlInstructions]);
  
  // Enhanced language options with icons
  // Build language options - conditionally add 'all' platform if HTML content exists
  const languages = [
    ...(htmlInstructions?.all ? [
      {
        id: 'all',
        name: 'All Platforms',
        icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg'
      }
    ] : []),
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

  // If we have HTML content but no structured instructions, use HTML content
  if (instructions.length === 0 && htmlInstructions?.all) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Installation Instructions</h2>
          <p className="text-gray-600 mt-1">
            Install {serverName || "this MCP server"} on your preferred platform
          </p>
        </div>
        
        <Alert variant="info" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            These installation instructions apply to all platforms.
          </AlertDescription>
        </Alert>
        
        <HtmlInstallBlock
          platform="All Platforms"
          htmlContent={htmlInstructions.all}
          className="border-gray-200"
        />
      </div>
    );
  }
  
  // If no instructions and no HTML content
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Installation Instructions</h2>
        <p className="text-gray-600 mt-1">
          Install {serverName || "this MCP server"} on your preferred platform
        </p>
      </div>

      <div className="w-full md:w-64 mb-6">
        <label className="text-sm text-gray-600 mb-2 block">
          Select Language / Platform
        </label>
        <div className="mb-5">
          <LanguageSelector
            languages={languages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            persistKey={`server_${serverId}`} // Use server ID for persistence key
            className="w-full md:w-64"
          />
        </div>
      </div>

      <div className="space-y-8">
        {/* Render HTML content if selected */}
        {selectedLanguage === 'all' && htmlInstructions?.all && (
          <HtmlInstallBlock
            platform="All Platforms"
            htmlContent={htmlInstructions.all}
            className="border-gray-200"
          />
        )}
        
        {/* Render normal installation blocks */}
        {selectedLanguage !== 'all' && instructions.map((instruction, index) => (
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
