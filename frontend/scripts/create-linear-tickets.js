#!/usr/bin/env node

/**
 * Linear Ticket Creation Script for Smithery-Inspired UI Redesign
 * 
 * This script uses the Linear API to create tickets for the remaining
 * tasks in the Smithery-inspired UI redesign project.
 * 
 * Usage:
 * 1. Set your Linear API key in the .env file: LINEAR_API_KEY=your_api_key
 * 2. Run: node create-linear-tickets.js
 */

require('dotenv').config();
const fetch = require('node-fetch');

// Configuration
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const TEAM_ID = process.env.LINEAR_TEAM_ID || 'YOUR_TEAM_ID';
const PROJECT_ID = process.env.LINEAR_PROJECT_ID || 'YOUR_PROJECT_ID';

// Linear GraphQL API endpoint
const LINEAR_API = 'https://api.linear.app/graphql';

// Headers for Linear API requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${LINEAR_API_KEY}`
};

// Ticket data for the remaining tasks in the Smithery redesign
const tickets = [
  {
    title: 'API Integration & Data Validation',
    description: `
# API Integration & Data Validation
Part of the Smithery-inspired UI redesign (XOM-104)

## Objectives
- Ensure all API endpoints return data in the expected format
- Add proper error handling for missing data
- Validate server response format against TypeScript interfaces

## Acceptance Criteria
- [ ] All API endpoints return data in the expected format
- [ ] Error handling is implemented for missing data
- [ ] Server response format is validated against TypeScript interfaces
- [ ] API error states display proper UI feedback
- [ ] Loading states are properly triggered during API calls

## Implementation Details
- Update fetch functions to handle errors gracefully
- Add type validation for API responses
- Implement retry mechanisms for critical data
- Add detailed logging for API failures

## Dependencies
- XOM-77: Server Installation API Consolidation
- XOM-104: Smithery-Inspired UI Redesign
`,
    priority: 2, // High
    estimate: 2, // 2 points
    label: 'api-integration'
  },
  {
    title: 'Responsive Design Testing',
    description: `
# Responsive Design Testing
Part of the Smithery-inspired UI redesign (XOM-104)

## Objectives
- Test layout on mobile devices (iOS, Android)
- Verify tab navigation works on smaller screens
- Ensure tap targets are appropriate size on mobile

## Acceptance Criteria
- [ ] Layout displays correctly on mobile devices (320px-428px width)
- [ ] Layout displays correctly on tablet devices (768px-1024px width)
- [ ] Tab navigation works on smaller screens
- [ ] Tap targets are at least 44x44px on mobile
- [ ] No horizontal overflow causing side scrolling

## Implementation Details
- Test on iOS Safari and Chrome for Android
- Use BrowserStack for device testing
- Fix any responsive layout issues
- Optimize for touch interactions on mobile

## Dependencies
- XOM-104: Smithery-Inspired UI Redesign
`,
    priority: 3, // Medium
    estimate: 1, // 1 point
    label: 'responsive-design'
  },
  {
    title: 'Loading State Optimizations',
    description: `
# Loading State Optimizations
Part of the Smithery-inspired UI redesign (XOM-104)

## Objectives
- Fine-tune skeleton loader timing
- Implement graceful fallbacks for failed data fetching
- Add retry mechanisms for critical data

## Acceptance Criteria
- [ ] Skeleton loaders display with proper timing
- [ ] Graceful fallbacks implemented for failed data fetching
- [ ] Retry mechanisms added for critical data
- [ ] Empty states designed and implemented for missing data
- [ ] Loading states feel smooth and professional

## Implementation Details
- Refine existing skeleton components
- Add configurable timeouts for skeleton display
- Implement retry logic for critical API calls
- Create empty state components for missing data

## Dependencies
- XOM-104: Smithery-Inspired UI Redesign
`,
    priority: 3, // Medium
    estimate: 1, // 1 point
    label: 'ux-enhancement'
  },
  {
    title: 'Cross-Browser Compatibility',
    description: `
# Cross-Browser Compatibility
Part of the Smithery-inspired UI redesign (XOM-104)

## Objectives
- Test in Chrome, Firefox, Safari, and Edge
- Verify custom scrollbars work in all browsers
- Ensure dark theme is consistent across browsers

## Acceptance Criteria
- [ ] UI renders correctly in Chrome, Firefox, Safari, and Edge
- [ ] Custom scrollbars work in all browsers with graceful fallbacks
- [ ] Dark theme is consistent across browsers
- [ ] No browser-specific layout issues
- [ ] All interactive elements work as expected across browsers

## Implementation Details
- Run through test cases in cross-browser-tests.md
- Fix any browser-specific issues
- Add vendor prefixes where needed
- Implement fallbacks for unsupported features

## Dependencies
- XOM-104: Smithery-Inspired UI Redesign
`,
    priority: 2, // High
    estimate: 2, // 2 points
    label: 'browser-compatibility'
  },
  {
    title: 'Accessibility Compliance',
    description: `
# Accessibility Compliance
Part of the Smithery-inspired UI redesign (XOM-104)

## Objectives
- Add proper ARIA labels to all interactive components
- Ensure keyboard navigation works for all tabs
- Verify color contrast meets WCAG standards
- Add screen reader support for tool documentation

## Acceptance Criteria
- [ ] All interactive components have proper ARIA labels
- [ ] Keyboard navigation works for all tabs and interactive elements
- [ ] Color contrast meets WCAG AA standards (4.5:1 for normal text)
- [ ] Screen reader support added for tool documentation
- [ ] Site passes WAVE accessibility validation

## Implementation Details
- Audit current components for accessibility issues
- Add missing ARIA attributes
- Test with keyboard navigation
- Verify color contrast with accessibility tools
- Test with screen readers

## Dependencies
- XOM-104: Smithery-Inspired UI Redesign
`,
    priority: 3, // Medium
    estimate: 2, // 2 points
    label: 'accessibility'
  },
  {
    title: 'Performance Optimization',
    description: `
# Performance Optimization
Part of the Smithery-inspired UI redesign (XOM-104)

## Objectives
- Implement code splitting for tab content
- Optimize image loading for server icons
- Add suspense boundaries for better loading patterns

## Acceptance Criteria
- [ ] Page loads within 3 seconds on 3G connection
- [ ] Code splitting implemented for tab content
- [ ] Image loading optimized for server icons
- [ ] Suspense boundaries added for better loading patterns
- [ ] Lighthouse performance score of 85+ on mobile and 90+ on desktop

## Implementation Details
- Use React.lazy for code splitting
- Implement responsive images with srcset
- Add image optimization for server icons
- Use Suspense for asynchronous components
- Run performance tests and optimize bottlenecks

## Dependencies
- XOM-104: Smithery-Inspired UI Redesign
`,
    priority: 4, // Low
    estimate: 2, // 2 points
    label: 'performance'
  }
];

/**
 * Creates a Linear ticket using the GraphQL API
 * @param {Object} ticket - The ticket data
 * @returns {Promise<Object>} - The created ticket
 */
async function createTicket(ticket) {
  const mutation = `
    mutation CreateIssue($title: String!, $description: String!, $teamId: String!, $projectId: String, $priority: Int, $estimate: Int, $labelName: String) {
      issueCreate(input: {
        title: $title,
        description: $description,
        teamId: $teamId,
        projectId: $projectId,
        priority: $priority,
        estimate: $estimate,
        labelIds: [$labelName]
      }) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `;

  const variables = {
    title: ticket.title,
    description: ticket.description,
    teamId: TEAM_ID,
    projectId: PROJECT_ID,
    priority: ticket.priority,
    estimate: ticket.estimate,
    labelName: ticket.label
  };

  try {
    const response = await fetch(LINEAR_API, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: mutation, variables })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('Error creating ticket:', data.errors);
      return null;
    }

    return data.data.issueCreate.issue;
  } catch (error) {
    console.error('Error creating ticket:', error);
    return null;
  }
}

/**
 * Main function to create all tickets
 */
async function createAllTickets() {
  console.log('Creating Linear tickets for Smithery-Inspired UI Redesign...');
  
  if (!LINEAR_API_KEY) {
    console.error('Error: LINEAR_API_KEY is not set. Please set it in your .env file.');
    process.exit(1);
  }

  for (const ticket of tickets) {
    console.log(`Creating ticket: ${ticket.title}...`);
    const createdTicket = await createTicket(ticket);
    
    if (createdTicket) {
      console.log(`✅ Created ticket: ${createdTicket.identifier} - ${createdTicket.title}`);
      console.log(`   URL: ${createdTicket.url}`);
    } else {
      console.log(`❌ Failed to create ticket: ${ticket.title}`);
    }
  }

  console.log('Done!');
}

// Run the script
createAllTickets();
