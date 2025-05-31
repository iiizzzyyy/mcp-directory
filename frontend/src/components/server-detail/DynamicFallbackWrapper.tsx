'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import DynamicServerDetailFallback from './DynamicServerDetailFallback';

/**
 * A wrapper component that determines if we should show a dynamic fallback
 * based on the current path.
 * 
 * This detects server detail pages from the URL pattern and renders
 * the dynamic fallback component with client-side data fetching.
 */
export default function DynamicFallbackWrapper() {
  const pathname = usePathname();
  const [serverId, setServerId] = useState<string | null>(null);

  useEffect(() => {
    // Extract server ID from path if it matches the server detail pattern
    const serverPathRegex = /^\/servers\/([^\/]+)$/;
    const matches = pathname.match(serverPathRegex);
    
    if (matches && matches[1]) {
      console.log('[Dynamic Fallback Wrapper] Detected server ID from path:', matches[1]);
      setServerId(matches[1]);
    } else {
      setServerId(null);
    }
  }, [pathname]);

  // If this isn't a server detail page, return null
  if (!serverId) {
    return null;
  }

  // Otherwise, render the dynamic fallback
  return <DynamicServerDetailFallback id={serverId} />;
}
