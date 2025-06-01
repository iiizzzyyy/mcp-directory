import { Metadata } from 'next';

/**
 * Servers section layout metadata
 */
export const metadata: Metadata = {
  title: {
    template: '%s | MCP Directory',
    default: 'MCP Servers Directory',
  },
  description: 'Browse and discover Model Context Protocol servers for your AI applications',
};

/**
 * Layout component for the servers section
 * Provides consistent layout for all server pages
 */
export default function ServersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="container mx-auto px-4 py-6">
      {children}
    </section>
  );
}
