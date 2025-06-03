# Cross-Browser Compatibility Test Plan
## XOM-101: Smithery-Inspired UI Redesign Testing

This document outlines the comprehensive cross-browser testing strategy for the Smithery-inspired dark-themed redesign of the MCP Directory's server details page.

## Test Environment Setup

### Browsers to Test
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome for Android

### Viewport Sizes
- Mobile: 375px × 667px (iPhone SE)
- Tablet: 768px × 1024px (iPad)
- Desktop: 1440px × 900px (Medium laptop)
- Large Desktop: 1920px × 1080px (Large monitor)

### Testing Tools
- Browser DevTools
- BrowserStack for device testing
- Lighthouse for performance metrics
- WAVE for accessibility validation

## Test Cases

### 1. Base Layout & Responsiveness

| ID | Test Description | Expected Outcome |
|---|---|---|
| 1.1 | Load server details page on all browsers/devices | Page loads with proper layout and no visual overflow |
| 1.2 | Verify dark theme consistency | All UI elements maintain dark theme styling on all browsers |
| 1.3 | Test responsive breakpoints | Layout adjusts appropriately at 640px, 768px, and 1024px breakpoints |
| 1.4 | Verify scrolling behavior | Custom scrollbars appear and function on supporting browsers, graceful fallback on others |
| 1.5 | Check font rendering | Fonts display consistently across browsers without jagged edges |

### 2. Component-Specific Tests

#### Server Header
| ID | Test Description | Expected Outcome |
|---|---|---|
| 2.1 | Verify server header layout | Title, description, and status badge display correctly on all viewports |
| 2.2 | Test verification badge | Badge color matches verification status and renders consistently |
| 2.3 | Check header responsive behavior | Header stacks vertically on mobile, horizontal on larger viewports |

#### Stats Panel
| ID | Test Description | Expected Outcome |
|---|---|---|
| 3.1 | Verify stats grid layout | Stats display in 3×2 grid on desktop, 2×3 or 1×6 on smaller screens |
| 3.2 | Check stat card hover effects | Hover effects work on desktop, disabled on touch devices |
| 3.3 | Test metric formatting | Large numbers format consistently (e.g., 10K instead of 10000) |

#### Tab Navigation
| ID | Test Description | Expected Outcome |
|---|---|---|
| 4.1 | Test tab switching | All tabs are clickable and display correct content when selected |
| 4.2 | Verify active tab styling | Active tab shows correct visual indicator on all browsers |
| 4.3 | Check tab overflow behavior | Tabs become scrollable on mobile without breaking layout |
| 4.4 | Test keyboard navigation | Tab focus indicators visible and tab selection works with keyboard |

#### Installation Panel
| ID | Test Description | Expected Outcome |
|---|---|---|
| 5.1 | Test installation tab switching | All installation methods (Auto, JSON, URL) display properly |
| 5.2 | Check code block formatting | Code blocks maintain formatting and syntax highlighting |
| 5.3 | Verify copy button functionality | Copy button works on all browsers, shows feedback when clicked |
| 5.4 | Test client selection | Client dropdown works on all devices with proper selection state |

#### Tools Section
| ID | Test Description | Expected Outcome |
|---|---|---|
| 6.1 | Verify tool cards expansion | Tool cards expand/collapse properly on click/tap |
| 6.2 | Test tool search functionality | Search filters tools correctly across all browsers |
| 6.3 | Check parameter badges | Parameter badges display proper colors for required/optional |
| 6.4 | Verify nested content | Nested parameter details expand without breaking layout |

### 3. Interactive Elements & Animations

| ID | Test Description | Expected Outcome |
|---|---|---|
| 7.1 | Test hover effects | Card hover effects work on desktop, disabled on touch devices |
| 7.2 | Check transitions | Tab switching and card expansion animations are smooth |
| 7.3 | Verify skeleton loading | Loading skeletons display properly during data fetch |
| 7.4 | Test focus states | Focus indicators are visible and accessible for all interactive elements |

### 4. Performance & Accessibility

| ID | Test Description | Expected Outcome |
|---|---|---|
| 8.1 | Measure load time | Page loads within 3 seconds on 3G connection |
| 8.2 | Test screen reader compatibility | All content accessible via screen reader, proper ARIA attributes |
| 8.3 | Check color contrast | All text meets WCAG AA contrast requirements (4.5:1 for normal text) |
| 8.4 | Verify keyboard navigation | All interactive elements accessible via keyboard |

## Issue Reporting Template

When filing issues in Linear, use the following template:

```
## Browser/Environment
- Browser: [e.g., Chrome 120]
- OS: [e.g., macOS 14.2]
- Viewport Size: [e.g., 1440×900]

## Test Case ID
[Reference ID from test plan]

## Description
[Clear description of the issue]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Screenshots
[If applicable]

## Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Severity
[Critical/High/Medium/Low]

## Related XOM Ticket
[e.g., XOM-104]
```

## Sign-Off Criteria

The Smithery redesign will be considered cross-browser compatible when:

1. All critical tests (1.1-1.5, 2.1-2.3, 4.1-4.3, 5.1-5.3, 6.1-6.2) pass on all tested browsers
2. No visual regressions are present in core functionality
3. All interactive elements function as expected across devices
4. Page meets WCAG AA standards for accessibility
5. Lighthouse performance score is 85+ on mobile and 90+ on desktop

## Testing Timeline

1. **Setup Testing Environment**: June 4, 2025
2. **Desktop Browser Testing**: June 5-6, 2025
3. **Mobile Browser Testing**: June 7-8, 2025
4. **Accessibility Testing**: June 9, 2025
5. **Performance Testing**: June 10, 2025
6. **Regression Testing**: June 11, 2025
7. **Issue Resolution**: June 12-13, 2025
8. **Final Sign-Off**: June 14, 2025
