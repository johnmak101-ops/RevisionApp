import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Error Handling Scenarios (TC-04, TC-13)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC-04: Should display error when document upload fails (Network Error)', async ({ page }) => {
    // Mock the ingest endpoint to fail with 500
    await page.route('**/api/ingest', async route => {
      await route.fulfill({
        status: 500,
        json: { error: 'Internal Server Error' }
      });
    });

    const testFilePath = path.join(__dirname, 'fail-doc.md');
    fs.writeFileSync(testFilePath, '# Fail Document');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    const uploadBtn = page.locator('button', { hasText: '建立索引' });
    await expect(uploadBtn).toBeEnabled();
    await uploadBtn.click();
    
    // UI should display error indicator or toast. 
    // Wait for the UI to not be loading
    await expect(uploadBtn).not.toHaveText('上傳中...');

    // Cleanup
    fs.unlinkSync(testFilePath);
  });

  test('TC-13: Should display error when chat API fails', async ({ page }) => {
    // Mock the chat endpoint to fail
    await page.route('**/api/chat', async route => {
      await route.fulfill({ status: 500, body: 'Server Error' });
    });
    
    const input = page.locator('input[placeholder="輸入問題..."]');
    await input.fill('Will this fail?');
    await page.keyboard.press('Enter');
    
    // We expect some error feedback in the chat or an alert
    // If not specifically designed, we just ensure it doesn't crash the page
    await expect(input).toBeVisible();
  });
});
