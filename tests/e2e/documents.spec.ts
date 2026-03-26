import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Document Management (TC-01, TC-03, TC-08)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC-08: Should load document list', async ({ page }) => {
    // Verify the file input is present
    await expect(page.locator('input[type="file"]')).toBeVisible();
    // Verify upload button is present
    await expect(page.locator('button[type="submit"]', { hasText: '建立索引' })).toBeVisible();
  });

  test('TC-03: Should reject invalid formats gracefully', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    // Ensure the accept attribute only allows proper formats
    await expect(fileInput).toHaveAttribute('accept', '.pdf,.md,.markdown');
  });

  test('TC-01: Should handle file upload flow', async ({ page }) => {
    // Create a temporary mock file
    const testFilePath = path.join(__dirname, 'test-doc.md');
    fs.writeFileSync(testFilePath, '# Test Document\nThis is a test.');
    
    // Mock the ingest endpoint with a delay to see the loading state
    await page.route('**/api/ingest', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({ json: { success: true, chunks: 5 } });
    });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    const uploadBtn = page.locator('button', { hasText: '建立索引' });
    await expect(uploadBtn).toBeEnabled();
    await uploadBtn.click();
    
    // Check loading indicator
    await expect(page.locator('button', { hasText: '上傳中...' })).toBeVisible();

    // Cleanup
    fs.unlinkSync(testFilePath);
  });
});
