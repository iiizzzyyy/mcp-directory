'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import DynamicServerDetailFallback from '@/components/server-detail/DynamicServerDetailFallback';

export default function NotFound() {
  const pathname = usePathname();
  const [serverId, setServerId] = useState<string | null>(null);
  const [isServerPath, setIsServerPath] = useState<boolean>(false);

  useEffect(() => {
    // Check if pathname is available first
    if (!pathname) return;
    
    // Extract server ID from path if it matches the server detail pattern
    const serverPathRegex = /^\/servers\/([^\/]+)$/;
    const matches = pathname.match(serverPathRegex);
    
    if (matches && matches[1]) {
      console.log('[Not Found] Detected server ID from path:', matches[1]);
      setServerId(matches[1]);
      setIsServerPath(true);
    } else {
      setServerId(null);
      setIsServerPath(false);
    }
  }, [pathname]);

  // If this is a server detail page, try dynamic fallback
  if (isServerPath && serverId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="text-yellow-700">
            <strong>Dynamic Fallback:</strong> This page was not pre-rendered during build time. 
            Attempting to load server data dynamically...
          </p>
        </div>
        <DynamicServerDetailFallback id={serverId} />
      </div>
    );
  }

  // Default 404 page for other routes
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-8 max-w-md">Sorry, the page you're looking for doesn't exist or has been moved.</p>
      <Link 
        href="/"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
