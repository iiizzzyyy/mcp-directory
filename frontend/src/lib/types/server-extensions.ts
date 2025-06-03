/**
 * Import hook for Extended Server type definitions
 * 
 * The Server type in index.ts already contains all the fields we need
 * for the Smithery-inspired UI redesign (XOM-104). This file just serves
 * to ensure that any components importing from `@/lib/types` have access
 * to the complete set of type definitions without needing explicit imports.
 *
 * No need to redeclare fields here since they are already defined in the main
 * Server interface in index.ts.
 */

import './index';

// This file exists primarily as an import hook for the build system
// and to document the extended Server type functionality.
