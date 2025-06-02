"use client";

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SearchInput from '@/components/search/SearchInput'

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Discover MCP Servers</span>
          <span className="block text-blue-600 mt-2">Connect, Build, and Extend</span>
        </h1>
        
        <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
          MCP Directory is the central hub for Model Context Protocol servers. Find, compare, and implement 
          AI capabilities into your applications with our curated collection of servers for authentication, 
          vector databases, speech recognition, and more.
        </p>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <SearchInput 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search servers by name, tag, or category..."
              className="w-full"
            />
            <Button 
              type="submit" 
              className="absolute right-1 p-2 h-8 w-8" 
              size="sm"
              variant="ghost"
              disabled={!searchQuery.trim()}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>
        
        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md">
            <Link href="/signup" className="flex items-center">
              Create Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="px-8 py-3 rounded-md">
            <Link href="/discover">
              Browse Servers
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Key Features Section */}
      <div className="mt-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Why Use MCP Directory?</h2>
        
        <div className="grid gap-8 md:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Discover</h3>
            <p className="text-gray-600">Find the perfect MCP servers for your AI application needs, with detailed compatibility information.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3 3 3-3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Install</h3>
            <p className="text-gray-600">Follow clear installation instructions with CLI commands and code examples for quick setup.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Implement</h3>
            <p className="text-gray-600">Access comprehensive API documentation to seamlessly integrate MCP servers into your projects.</p>
          </div>
        </div>
      </div>
      
      <div className="mt-16 text-center">
        <Link href="/discover" className="text-blue-600 font-medium hover:text-blue-800 flex items-center justify-center">
          View All Servers
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
