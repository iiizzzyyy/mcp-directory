'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import DynamicServerDetailFallback from './DynamicServerDetailFallback';

interface Props {
  children: ReactNode;
  serverId: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for server detail pages.
 * 
 * This catches errors during rendering and provides a fallback
 * to the dynamic client-side component when static content fails.
 */
export default class ServerDetailErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('[Error Boundary] Error caught:', error);
    console.error('[Error Boundary] Error info:', errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render dynamic fallback with client-side data fetching
      console.log('[Error Boundary] Rendering dynamic fallback for server:', this.props.serverId);
      return <DynamicServerDetailFallback id={this.props.serverId} />;
    }

    // Render children normally
    return this.props.children;
  }
}
