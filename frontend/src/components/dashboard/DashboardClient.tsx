"use client";

import React, { useState } from 'react';
import { mockServers } from '@/lib/mock-data';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Client-side Dashboard component for static export
 * This version contains all UI elements but avoids complex data fetching
 * and chart rendering that could cause timeouts
 */
export default function DashboardClient() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedServer, setSelectedServer] = useState('all');

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Performance Dashboard</h1>
          
          <Tabs 
            value={selectedPeriod} 
            onValueChange={setSelectedPeriod}
            className="w-full md:w-auto"
          >
            <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full md:w-auto">
              <TabsTrigger value="1h">1h</TabsTrigger>
              <TabsTrigger value="6h">6h</TabsTrigger>
              <TabsTrigger value="12h">12h</TabsTrigger>
              <TabsTrigger value="1d">1d</TabsTrigger>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">All Servers</h2>
          
          <select 
            className="px-3 py-2 border rounded-md text-sm"
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
          >
            <option value="all">All Servers</option>
            {mockServers.map(server => (
              <option key={server.id} value={server.id}>{server.name}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Average Latency</div>
            <div className="text-2xl font-bold">125 ms</div>
            <div className="text-xs text-green-600 mt-1">↓ 5% from previous period</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Uptime</div>
            <div className="text-2xl font-bold">99.98%</div>
            <div className="text-xs text-green-600 mt-1">↑ 0.02% from previous period</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Memory Usage</div>
            <div className="text-2xl font-bold">512 MB</div>
            <div className="text-xs text-gray-600 mt-1">No change from previous period</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Throughput</div>
            <div className="text-2xl font-bold">250 rps</div>
            <div className="text-xs text-green-600 mt-1">↑ 12% from previous period</div>
          </Card>
        </div>
        
        <div className="bg-gray-100 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">Server Status Summary</h3>
          
          <div className="space-y-4">
            {mockServers.map(server => (
              <div key={server.id} className="flex justify-between items-center p-3 bg-white rounded shadow-sm">
                <div>
                  <div className="font-medium">{server.name}</div>
                  <div className="text-sm text-gray-500">{server.category}</div>
                </div>
                
                <div className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    server.health_status === 'online' 
                      ? 'bg-green-500' 
                      : server.health_status === 'degraded' 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`}></span>
                  <span className="text-sm capitalize">{server.health_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
