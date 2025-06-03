/**
 * Type extensions index file 
 * Ensures all extended type definitions are properly loaded
 * Part of XOM-104: Smithery-Inspired UI Redesign
 */

// Import the base types
import './index';

// Import all type extensions to ensure they're included in the TypeScript compilation
import './server-extensions';
import './tool';

// Re-export everything from the base types for convenience
export * from './index';
