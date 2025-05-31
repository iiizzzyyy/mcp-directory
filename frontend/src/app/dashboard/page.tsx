import { Metadata } from "next";
import DashboardClient from "@/components/dashboard/DashboardClient";

/**
 * Simple static dashboard page that uses a client component
 * This approach avoids timeouts during static export
 */
export default function DashboardPage() {
  return <DashboardClient />;
}

export const metadata: Metadata = {
  title: "Performance Dashboard | MCP Directory",
  description: "Real-time performance metrics for MCP servers",
};
