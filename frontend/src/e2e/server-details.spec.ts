/**
 * Server Detail Page Tests
 * 
 * Tests to verify that server detail pages load correctly and installation
 * instructions are properly displayed without edge function errors.
 */
import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to test if a specific server detail page loads correctly
 * 
 * @param page - Playwright page object
 * @param slug - Server slug to test
 */
async function testServerDetailPage(page: Page, slug: string) {
  // Navigate to the server detail page
  await page.goto(`/servers/${slug}`);

  // Wait for the page to load and server name to be visible
  await expect(page.locator('h1.server-title')).toBeVisible({ timeout: 10000 });
  
  // Make sure there are no edge function errors displayed
  const errorText = page.getByText('Edge Function returned a non-2xx status code');
  await expect(errorText).not.toBeVisible();
  
  // Check for installation instructions section
  const installTab = page.getByRole('tab', { name: /installation/i });
  if (await installTab.isVisible()) {
    await installTab.click();
    
    // Wait for platform tabs to be visible
    const platformTabs = page.locator('.platform-tabs');
    if (await platformTabs.isVisible()) {
      // Verify code blocks are displayed
      const codeBlocks = page.locator('.code-block');
      await expect(codeBlocks).toBeVisible();
      
      // Test that the copy button works
      const copyButton = page.locator('.copy-button').first();
      if (await copyButton.isVisible()) {
        await copyButton.click();
        // Verify success state after clicking (could be a tooltip or class change)
      }
    }
  }
  
  // Take screenshot of the page for visual reference
  await page.screenshot({ path: `./test-results/${slug}-detail.png` });
  
  console.log(`✅ Server page for ${slug} loaded successfully`);
}

// Test for a known server that previously had issues
test('Previously problematic server detail page loads correctly', async ({ page }) => {
  await testServerDetailPage(page, 'arize-ai-phoenix');
});

// Test for a server that should 404 properly
test('Non-existent server returns proper 404 page', async ({ page }) => {
  await page.goto('/servers/this-server-does-not-exist');
  
  // Wait for the 404 page to load
  await expect(page.locator('text=Server not found')).toBeVisible();
  
  // No edge function errors should be displayed
  const errorText = page.getByText('Edge Function returned a non-2xx status code');
  await expect(errorText).not.toBeVisible();
});

// Test for a batch of popular servers
test('Popular server detail pages load correctly', async ({ page }) => {
  const popularServers = [
    'supabase-mcp-server',
    'firecrawl-mcp',
    'netlify-mcp',
    'hubspot-mcp',
    'linear-mcp'
  ];
  
  for (const slug of popularServers) {
    await testServerDetailPage(page, slug);
  }
});

// Test the server listing page loads and links work
test('Server listing page loads and detail links work', async ({ page }) => {
  // Navigate to the servers listing page
  await page.goto('/servers');
  
  // Wait for the page to load and verify server cards are visible
  const serverCards = page.locator('.server-card');
  await expect(serverCards).toBeVisible();
  
  // Click on the first server card
  const firstServerCard = serverCards.first();
  await firstServerCard.click();
  
  // Verify we navigated to a detail page
  await expect(page.locator('h1.server-title')).toBeVisible();
});

// Test server search functionality
test('Server search finds relevant results', async ({ page }) => {
  // Navigate to the servers listing page
  await page.goto('/servers');
  
  // Wait for the search input to be visible
  const searchInput = page.getByPlaceholder('Search servers...');
  await expect(searchInput).toBeVisible();
  
  // Search for a known term
  await searchInput.fill('supabase');
  await searchInput.press('Enter');
  
  // Wait for search results to update
  await page.waitForTimeout(500);
  
  // Verify that relevant results are shown
  const serverCards = page.locator('.server-card');
  await expect(serverCards).toBeVisible();
  
  // At least one card should contain "supabase" text
  const supabaseCard = page.locator('.server-card:has-text("supabase")');
  await expect(supabaseCard).toBeVisible();
});
