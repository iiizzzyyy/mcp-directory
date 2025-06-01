"use client";

import { useState, useEffect } from 'react';
import InstallBlock from './InstallBlock';
import LanguageSelector from './LanguageSelector';

interface InstallInstruction {
  platform: string;
  icon_url: string | null;
  install_command: string;
  additional_steps?: string | null;
  requirements?: string | null;
}

interface ClientInstallationTabProps {
  serverId: string;
  serverName?: string;
  defaultInstallCommand?: string;
  instructions: InstallInstruction[];
}

/**
 * Client component that handles the interactive UI elements for installation
 * Works with the ServerInstall component which fetches the data server-side
 */
export default function ClientInstallationTab({ 
  serverId, 
  serverName,
  defaultInstallCommand,
  instructions
}: ClientInstallationTabProps) {
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
