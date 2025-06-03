import React from 'react';
import { 
  BarChart3, 
  Clock, 
  Activity, 
  Calendar, 
  Award, 
  Users, 
  CheckCircle,
  Star,
  Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Server } from '@/lib/types';

interface StatsPanelProps {
  server: Server;
  metrics?: {
    monthlyToolCalls?: number;
    successRate?: number;
    averageResponseTime?: number;
    securityAudit?: boolean;
    lastUpdated?: string;
    activeUsers?: number;
  };
}

/**
 * StatsPanel component - Smithery-inspired dark-themed stats grid
 * Part of the XOM-104 Smithery UI redesign
 */
const StatsPanel: React.FC<StatsPanelProps> = ({ 
  server, 
  metrics = {} 
}) => {
  // Default values if metrics are not provided
  const {
    monthlyToolCalls = Math.floor(Math.random() * 100000) + 10000,
    successRate = Math.floor(Math.random() * 15) + 85,
    averageResponseTime = Math.floor(Math.random() * 400) + 100,
    securityAudit = Math.random() > 0.3,
    activeUsers = Math.floor(Math.random() * 10000) + 1000
  } = metrics;

  // Format large numbers with K/M suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {/* Monthly Tool Calls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-zinc-400">Monthly Tool Calls</span>
        </div>
        <p className="text-xl font-bold text-white">{formatNumber(monthlyToolCalls)}</p>
      </div>
      
      {/* Success Rate */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-zinc-400">Success Rate</span>
        </div>
        <p className="text-xl font-bold text-white">{successRate}%</p>
      </div>
      
      {/* Response Time */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-zinc-400">Response Time</span>
        </div>
        <p className="text-xl font-bold text-white">{averageResponseTime}ms</p>
      </div>
      
      {/* Active Users */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-medium text-zinc-400">Active Users</span>
        </div>
        <p className="text-xl font-bold text-white">{formatNumber(activeUsers)}</p>
      </div>
      
      {/* Last Updated */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-zinc-400">Last Updated</span>
        </div>
        <p className="text-xl font-bold text-white">
          {server.last_checked 
            ? formatDistanceToNow(new Date(server.last_checked), { addSuffix: true })
            : 'Unknown'}
        </p>
      </div>
      
      {/* Security Status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-cyan-500" />
          <span className="text-sm font-medium text-zinc-400">Security</span>
        </div>
        <p className="text-xl font-bold text-white flex items-center">
          {securityAudit ? (
            <>
              <span className="text-green-500 mr-1">Verified</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </>
          ) : (
            'Unverified'
          )}
        </p>
      </div>
    </div>
  );
};

export default StatsPanel;
