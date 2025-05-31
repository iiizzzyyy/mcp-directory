// Local test script for crawl-pulsemcp-servers function
// Run with: deno run --allow-net --allow-env test.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Mock server request
const req = {
  method: "POST",
  json: async () => ({ limit: 1 }) // Test with just one server
};

// Mock console for cleaner output
const originalConsole = console;
console.log = (...args) => {
  originalConsole.log("\x1b[34m[LOG]\x1b[0m", ...args);
};
console.error = (...args) => {
  originalConsole.error("\x1b[31m[ERROR]\x1b[0m", ...args);
};

// Import and run the function
import { serve } from "./index.ts";

console.log("Testing PulseMCP server crawler...");
const response = await serve(req as any);
const result = await response.json();

console.log("Test completed with result:", JSON.stringify(result, null, 2));
