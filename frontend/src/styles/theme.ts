/**
 * MCP Directory Theme Configuration
 * 
 * This file centralizes the theme configuration for the MCP Directory application.
 * It includes a pastel color palette, font settings, and other design tokens.
 */

export const theme = {
  // Font families
  fonts: {
    primary: 'Inter, "Open Sans", system-ui, sans-serif',
  },
  
  // Pastel color palette (same as defined in tailwind.config.js)
  colors: {
    pastel: {
      blue: '#BFD7ED',
      green: '#C1E1C1',
      yellow: '#FCF4DD',
      red: '#FFD4D4',
      purple: '#E2D1F9',
      cyan: '#C7EAE4',
      pink: '#FFE5EC',
      orange: '#FFE5B4'
    },
    
    // Semantic colors
    primary: 'hsl(207, 52%, 84%)',    // Pastel blue
    secondary: 'hsl(120, 25%, 82%)',  // Pastel green
    accent: 'hsl(280, 47%, 90%)',     // Pastel purple
    destructive: 'hsl(0, 70%, 90%)',  // Soft red
    
    // Status colors (for server health indicators)
    status: {
      online: '#86EFAC',      // Light green
      offline: '#FECACA',     // Light red
      degraded: '#FEF08A',    // Light yellow
      unknown: '#E4E4E7'      // Light gray
    },
    
    // Text colors
    text: {
      primary: 'hsl(220, 20%, 25%)',
      secondary: 'hsl(220, 10%, 45%)',
      muted: 'hsl(220, 10%, 60%)'
    },
    
    // Surface colors
    surface: {
      background: 'hsl(0, 0%, 100%)',
      card: 'hsl(0, 0%, 100%)',
      border: 'hsl(220, 20%, 92%)'
    }
  },
  
  // Spacing and sizing scale
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '4rem'
  },
  
  // Border radius
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px'
  },
  
  // Typography
  typography: {
    lineHeight: '1.75',
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    }
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  },
  
  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1300,
    toast: 1400,
    tooltip: 1500
  }
};

// Commonly used status color mappings for server health
export const statusColors = {
  online: theme.colors.status.online,
  offline: theme.colors.status.offline,
  degraded: theme.colors.status.degraded,
  unknown: theme.colors.status.unknown
};

export default theme;
