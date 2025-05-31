"use client";

import React, { useState } from 'react';
import { RuleBlock } from '@/components/rules/rule-block';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Code, 
  Shield, 
  Lock, 
  Database, 
  Network, 
  FileCheck,
  AlertTriangle,
  Server,
  BookOpen,
  LineChart,
  Bell
} from 'lucide-react';

/**
 * Demo page for the RuleBlock component
 * Showcases various configurations and use cases
 */
export default function RuleBlockDemoPage() {
  // State for configurable options
  const [borderWidth, setBorderWidth] = useState<'thin' | 'medium' | 'thick'>('medium');
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed'>('solid');
  
  // Rule examples
  const apiRules = [
    {
      title: "Use RESTful Endpoints",
      description: "Design endpoints following REST principles with resources as nouns and HTTP methods for actions.",
      icon: <Code className="h-5 w-5" />,
      color: 'blue'
    },
    {
      title: "API Versioning",
      description: "Include API version in URL path (e.g., /v1/resource) to ensure backward compatibility.",
      icon: <FileCheck className="h-5 w-5" />,
      color: 'green'
    },
    {
      title: "Rate Limiting",
      description: "Implement rate limiting to prevent abuse and ensure fair resource allocation across clients.",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'amber'
    }
  ];
  
  const securityRules = [
    {
      title: "Authentication Required",
      description: "All endpoints must require proper authentication except explicitly defined public routes.",
      icon: <Shield className="h-5 w-5" />,
      color: 'indigo'
    },
    {
      title: "Input Validation",
      description: "Validate and sanitize all input data to prevent injection attacks and data corruption.",
      icon: <Lock className="h-5 w-5" />,
      color: 'red'
    },
    {
      title: "Secure Data Storage",
      description: "Encrypt sensitive data at rest and use secure storage options for PII and credentials.",
      icon: <Database className="h-5 w-5" />,
      color: 'purple'
    }
  ];
  
  const performanceRules = [
    {
      title: "Response Time",
      description: "API endpoints should respond within 300ms for read operations and 500ms for write operations.",
      icon: <LineChart className="h-5 w-5" />,
      color: 'teal'
    },
    {
      title: "Caching Strategy",
      description: "Implement appropriate caching with proper cache headers for improved performance.",
      icon: <Server className="h-5 w-5" />,
      color: 'orange'
    },
    {
      title: "Error Monitoring",
      description: "Configure monitoring for all critical paths and set up alerts for performance degradation.",
      icon: <Bell className="h-5 w-5" />,
      color: 'pink'
    }
  ];
  
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Rule Block UI Component</h1>
      <p className="text-muted-foreground mb-8">
        Boxed UI elements for displaying rules with pastel borders, titles and descriptions
      </p>
      
      {/* Configuration options */}
      <div className="mb-8 p-6 border rounded-lg bg-muted/30">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-md font-medium">Border Width</h3>
            <RadioGroup 
              value={borderWidth} 
              onValueChange={(value) => setBorderWidth(value as 'thin' | 'medium' | 'thick')}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="thin" id="thin" />
                <Label htmlFor="thin">Thin</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="thick" id="thick" />
                <Label htmlFor="thick">Thick</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-md font-medium">Border Style</h3>
            <RadioGroup 
              value={borderStyle} 
              onValueChange={(value) => setBorderStyle(value as 'solid' | 'dashed')}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="solid" id="solid" />
                <Label htmlFor="solid">Solid</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dashed" id="dashed" />
                <Label htmlFor="dashed">Dashed</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>
      
      {/* Rule block examples */}
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="api">API Rules</TabsTrigger>
          <TabsTrigger value="security">Security Rules</TabsTrigger>
          <TabsTrigger value="performance">Performance Rules</TabsTrigger>
          <TabsTrigger value="colors">Color Variations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api" className="space-y-6">
          {apiRules.map((rule, index) => (
            <RuleBlock
              key={index}
              title={rule.title}
              description={rule.description}
              icon={rule.icon}
              color={rule.color as any}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
              onClick={() => console.log(`Clicked rule: ${rule.title}`)}
            />
          ))}
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          {securityRules.map((rule, index) => (
            <RuleBlock
              key={index}
              title={rule.title}
              description={rule.description}
              icon={rule.icon}
              color={rule.color as any}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
              onClick={() => console.log(`Clicked rule: ${rule.title}`)}
            />
          ))}
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          {performanceRules.map((rule, index) => (
            <RuleBlock
              key={index}
              title={rule.title}
              description={rule.description}
              icon={rule.icon}
              color={rule.color as any}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
              onClick={() => console.log(`Clicked rule: ${rule.title}`)}
            />
          ))}
        </TabsContent>
        
        <TabsContent value="colors" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RuleBlock
              title="Blue Rule"
              description="This rule block uses the blue pastel color theme."
              color="blue"
              icon={<Network className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
            
            <RuleBlock
              title="Green Rule"
              description="This rule block uses the green pastel color theme."
              color="green"
              icon={<FileCheck className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
            
            <RuleBlock
              title="Purple Rule"
              description="This rule block uses the purple pastel color theme."
              color="purple"
              icon={<Database className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
            
            <RuleBlock
              title="Pink Rule"
              description="This rule block uses the pink pastel color theme."
              color="pink"
              icon={<Bell className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
            
            <RuleBlock
              title="Amber Rule"
              description="This rule block uses the amber pastel color theme."
              color="amber"
              icon={<AlertTriangle className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
            
            <RuleBlock
              title="Indigo Rule"
              description="This rule block uses the indigo pastel color theme."
              color="indigo"
              icon={<Shield className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
            
            <RuleBlock
              title="Red Rule"
              description="This rule block uses the red pastel color theme."
              color="red"
              icon={<Lock className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
            
            <RuleBlock
              title="Teal Rule"
              description="This rule block uses the teal pastel color theme."
              color="teal"
              icon={<LineChart className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
            
            <RuleBlock
              title="Orange Rule"
              description="This rule block uses the orange pastel color theme."
              color="orange"
              icon={<Server className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
            
            <RuleBlock
              title="Random Color"
              description="This rule block uses a randomly assigned color based on the title text."
              color="random"
              icon={<BookOpen className="h-5 w-5" />}
              borderWidth={borderWidth}
              borderStyle={borderStyle}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
