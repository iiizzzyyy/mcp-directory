import React from 'react';
import { InfoIcon, Wrench, Code, Activity, Library } from 'lucide-react';

interface TabNavigationProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

/**
 * TabNavigation component - Smithery-inspired tab navigation
 * Part of the XOM-104 Smithery UI redesign
 */
const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <InfoIcon className="h-4 w-4" /> },
    { id: 'tools', label: 'Tools', icon: <Wrench className="h-4 w-4" /> },
    { id: 'api', label: 'API', icon: <Code className="h-4 w-4" /> },
    { id: 'compatibility', label: 'Compatibility', icon: <Library className="h-4 w-4" /> },
    { id: 'metrics', label: 'Metrics', icon: <Activity className="h-4 w-4" /> },
  ];
  
  return (
    <div className="border-b border-zinc-800 mb-6">
      <nav className="flex overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`
              flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium whitespace-nowrap
              ${activeTab === tab.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'}
              transition-colors
            `}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;
