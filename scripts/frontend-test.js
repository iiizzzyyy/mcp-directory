#!/usr/bin/env node

/**
 * Frontend Test Script
 * 
 * Tests all pages of the MCP Directory frontend, captures screenshots,
 * and logs any console errors found during navigation.
 * 
 * Usage:
 *   node scripts/frontend-test.js [base-url]
 * 
 * Arguments:
 *   base-url: Optional base URL to test (default: http://localhost:3000)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Create reports directory if it doesn't exist
const REPORTS_DIR = path.join(__dirname, '../reports');
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');
const timestamp = new Date().toISOString().replace(/:/g, '-');
const TEST_DIR = path.join(SCREENSHOTS_DIR, `frontend-test-${timestamp}`);

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR);
}

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR);
}

if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR);
}

// Configuration
const baseUrl = process.argv[2] || 'http://localhost:3000';
const timeout = 30000; // 30 seconds timeout for page loads

// All routes to test
const routes = [
  { path: '/', name: 'home' },
  { path: '/about', name: 'about' },
  { path: '/community', name: 'community' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/dashboard-demo', name: 'dashboard-demo' },
  { path: '/discover', name: 'discover' },
  { path: '/docs', name: 'docs' },
  { path: '/docs/getting-started/installation', name: 'docs-installation' },
  { path: '/login', name: 'login' },
  { path: '/markdown-demo', name: 'markdown-demo' },
  { path: '/privacy', name: 'privacy' },
  { path: '/rule-block-demo', name: 'rule-block-demo' },
  { path: '/rules', name: 'rules' },
  { path: '/servers', name: 'servers' },
  { path: '/servers/5c0f442d-cc51-df84-beae-7bf0ba466a14', name: 'server-detail' }, // Example server ID
  { path: '/signup', name: 'signup' },
  { path: '/submit', name: 'submit' },
  // API routes (these might redirect or return JSON)
  { path: '/api/server-tools?id=5c0f442d-cc51-df84-beae-7bf0ba466a14', name: 'api-server-tools', isApi: true },
  { path: '/api/servers/5c0f442d-cc51-df84-beae-7bf0ba466a14', name: 'api-server-detail', isApi: true },
  { path: '/api/servers/search?q=test', name: 'api-server-search', isApi: true }
];

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  baseUrl,
  summary: {
    total: routes.length,
    success: 0,
    failed: 0,
    withErrors: 0
  },
  pages: []
};

/**
 * Run tests for all pages
 */
async function runTests() {
  console.log(chalk.bold.blue('🧪 Frontend Test: MCP Directory'));
  console.log(chalk.blue(`📡 Testing URL: ${baseUrl}`));
  console.log(chalk.blue(`📊 Testing ${routes.length} routes`));
  console.log(chalk.blue(`📁 Reports dir: ${TEST_DIR}`));
  console.log(chalk.blue('-------------------------------------'));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 800 }
  });

  for (const route of routes) {
    const url = `${baseUrl}${route.path}`;
    console.log(chalk.yellow(`🔍 Testing: ${route.name} (${url})`));
    
    const result = {
      name: route.name,
      path: route.path,
      url,
      success: false,
      status: null,
      consoleErrors: [],
      consoleWarnings: [],
      consoleInfo: [],
      screenshotPath: null,
      loadTimeMs: 0,
      isApi: !!route.isApi
    };
    
    const page = await browser.newPage();
    
    // Collect console logs
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        result.consoleErrors.push(text);
        console.log(chalk.red(`  ❌ Console Error: ${text}`));
      } else if (type === 'warning') {
        result.consoleWarnings.push(text);
      } else if (type === 'info' || type === 'log') {
        result.consoleInfo.push(text);
      }
    });
    
    // Track page failures
    page.on('pageerror', (error) => {
      result.consoleErrors.push(`Page Error: ${error.message}`);
      console.log(chalk.red(`  ❌ Page Error: ${error.message}`));
    });
    
    // Track request failures
    page.on('requestfailed', (request) => {
      result.consoleErrors.push(`Request Failed: ${request.url()} - ${request.failure().errorText}`);
      console.log(chalk.red(`  ❌ Request Failed: ${request.url()}`));
    });
    
    try {
      const startTime = Date.now();
      const response = await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout 
      });
      const endTime = Date.now();
      
      result.loadTimeMs = endTime - startTime;
      result.status = response.status();
      
      // Take screenshot for non-API routes
      if (!route.isApi) {
        const screenshotPath = path.join(TEST_DIR, `${route.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        result.screenshotPath = screenshotPath;
        console.log(chalk.blue(`  📸 Screenshot saved: ${screenshotPath}`));
      }
      
      // Check for success
      if (result.status >= 200 && result.status < 400) {
        result.success = true;
        results.summary.success++;
        console.log(chalk.green(`  ✅ Success: ${result.status} (${result.loadTimeMs}ms)`));
      } else {
        result.success = false;
        results.summary.failed++;
        console.log(chalk.red(`  ❌ Failed with status: ${result.status}`));
      }
      
      // Count pages with errors
      if (result.consoleErrors.length > 0) {
        results.summary.withErrors++;
      }
      
    } catch (error) {
      result.success = false;
      results.summary.failed++;
      result.consoleErrors.push(`Navigation Error: ${error.message}`);
      console.log(chalk.red(`  ❌ Navigation Failed: ${error.message}`));
      
      // Try to take a screenshot even if navigation failed
      try {
        if (!route.isApi) {
          const screenshotPath = path.join(TEST_DIR, `${route.name}-error.png`);
          await page.screenshot({ path: screenshotPath });
          result.screenshotPath = screenshotPath;
          console.log(chalk.blue(`  📸 Error screenshot saved: ${screenshotPath}`));
        }
      } catch (screenshotError) {
        console.log(chalk.red(`  ❌ Failed to capture error screenshot: ${screenshotError.message}`));
      }
    }
    
    results.pages.push(result);
    await page.close();
  }
  
  await browser.close();
  
  // Save test results
  const resultsPath = path.join(TEST_DIR, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(chalk.blue(`📊 Results saved to: ${resultsPath}`));
  
  // Generate Linear ticket if there are errors
  if (results.summary.withErrors > 0 || results.summary.failed > 0) {
    generateLinearTicket(results);
  }
  
  // Display summary
  console.log(chalk.bold.blue('\n📊 Test Summary:'));
  console.log(chalk.blue(`📄 Total pages tested: ${results.summary.total}`));
  console.log(chalk.green(`✅ Successful: ${results.summary.success}`));
  console.log(chalk.red(`❌ Failed: ${results.summary.failed}`));
  console.log(chalk.yellow(`⚠️ Pages with console errors: ${results.summary.withErrors}`));
  
  return results;
}

/**
 * Generate a Linear ticket with test results
 * @param {Object} results - Test results
 */
function generateLinearTicket(results) {
  const ticketPath = path.join(REPORTS_DIR, `linear-ticket-frontend-errors-${timestamp}.md`);
  
  const pagesWithErrors = results.pages.filter(page => 
    !page.success || page.consoleErrors.length > 0
  );
  
  let ticketContent = `# Frontend Test Errors (${new Date().toISOString().split('T')[0]})

## Summary
- **Total Pages Tested:** ${results.summary.total}
- **Failed Pages:** ${results.summary.failed}
- **Pages with Console Errors:** ${results.summary.withErrors}
- **Base URL:** ${results.baseUrl}

## Details

${pagesWithErrors.map(page => `
### ${page.name} (${page.path})
- **Status:** ${page.success ? '✅ Success' : '❌ Failed'} (${page.status})
- **Load Time:** ${page.loadTimeMs}ms
- **URL:** ${page.url}
${page.consoleErrors.length > 0 ? `
#### Console Errors:
${page.consoleErrors.map(err => `- \`${err}\``).join('\n')}
` : ''}
${page.consoleWarnings.length > 0 ? `
#### Console Warnings:
${page.consoleWarnings.map(warn => `- \`${warn}\``).join('\n')}
` : ''}
${page.screenshotPath ? `- [Screenshot](${page.screenshotPath.replace(process.cwd(), '')})` : ''}
`).join('\n')}

## Analysis

Based on the errors found, the following issues need to be addressed:

${generateErrorAnalysis(pagesWithErrors)}

## Fix Plan

1. Address console errors in priority order:
   - First fix critical rendering errors that prevent page functionality
   - Then address API/fetch related errors
   - Finally address asset loading errors

2. For each page with errors:
   - Reproduce the error locally
   - Debug using browser dev tools
   - Implement and test fixes
   - Verify fix resolves the issue

3. Rerun tests after fixes to verify all issues are resolved

## Estimated Effort

- **Story Points:** ${Math.min(5, Math.ceil(results.summary.withErrors / 2))}
- **Priority:** ${results.summary.failed > 0 ? 'High' : 'Medium'}
- **Deadline:** ASAP
`;

  fs.writeFileSync(ticketPath, ticketContent);
  console.log(chalk.green(`📝 Linear ticket draft created: ${ticketPath}`));
  console.log(chalk.yellow('Please review the ticket before submitting to Linear.'));
}

/**
 * Generate error analysis from test results
 * @param {Array} pagesWithErrors - Pages with errors
 * @returns {String} Error analysis
 */
function generateErrorAnalysis(pagesWithErrors) {
  // Group similar errors
  const errorGroups = {};
  
  pagesWithErrors.forEach(page => {
    page.consoleErrors.forEach(error => {
      // Simplify error message to group similar errors
      const simplifiedError = error
        .replace(/\b\w+:\/\/[^/\s]+\/[^\s]+/g, '[URL]') // Replace URLs
        .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, '[UUID]') // Replace UUIDs
        .replace(/\b\d+\b/g, '[NUM]'); // Replace numbers
      
      if (!errorGroups[simplifiedError]) {
        errorGroups[simplifiedError] = {
          count: 0,
          originalError: error,
          pages: []
        };
      }
      
      errorGroups[simplifiedError].count++;
      errorGroups[simplifiedError].pages.push(page.name);
    });
  });
  
  // Sort errors by frequency
  const sortedErrors = Object.values(errorGroups).sort((a, b) => b.count - a.count);
  
  if (sortedErrors.length === 0) {
    return "No specific console errors found, but some pages failed to load correctly.";
  }
  
  // Generate analysis
  return sortedErrors.map(error => 
    `- **Error**: \`${error.originalError}\`
  - **Frequency**: Found on ${error.count} page(s): ${error.pages.join(', ')}
  - **Potential causes**: ${getPotentialCauses(error.originalError)}
`).join('\n');
}

/**
 * Get potential causes for common error types
 * @param {String} error - Error message
 * @returns {String} Potential causes
 */
function getPotentialCauses(error) {
  if (error.includes('Failed to fetch') || error.includes('NetworkError')) {
    return 'API endpoint unreachable, CORS issue, or network failure';
  }
  
  if (error.includes('is not defined') || error.includes('is not a function')) {
    return 'JavaScript reference error, likely a missing import or undefined variable';
  }
  
  if (error.includes('Cannot read property') || error.includes('Cannot read properties')) {
    return 'Trying to access properties of null/undefined objects, likely a race condition or missing data validation';
  }
  
  if (error.includes('Loading chunk')) {
    return 'Failed to load JavaScript chunk, possibly a build or code-splitting issue';
  }
  
  if (error.includes('Module not found')) {
    return 'Missing module or incorrect import path';
  }
  
  if (error.includes('403') || error.includes('401')) {
    return 'Authentication/authorization issue with API endpoint';
  }
  
  if (error.includes('404')) {
    return 'Resource not found, check URL path or API endpoint';
  }
  
  if (error.includes('TypeError')) {
    return 'JavaScript type error, possibly incorrect data structure or type mismatch';
  }
  
  return 'Unknown error cause, requires further investigation';
}

// Run the tests
runTests()
  .catch(error => {
    console.error(chalk.red('Test script failed:'), error);
    process.exit(1);
  });
