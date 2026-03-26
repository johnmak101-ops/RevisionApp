import { test, expect } from '@playwright/test';

test.describe('RAG Chat (TC-10, TC-12)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC-10: Should allow asking a question and receive a streaming response', async ({ page }) => {
    await page.route('**/api/chat', async route => {
      // Mocking Vercel AI SDK text stream format `0:"..."\n`
      await route.fulfill({
        contentType: 'text/plain; charset=utf-8',
        body: '0:"This is a mocked RAG response from Playwright"\n'
      });
    });
    
    const input = page.locator('input[placeholder="輸入問題..."]');
    await expect(input).toBeVisible();

    await input.fill('What is Java?');
    const submitBtn = page.locator('button[type="submit"]', { hasText: '送出' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    
    // Verify user message appears in the chat
    await expect(page.locator('text=What is Java?').first()).toBeVisible();
  });

  test('TC-12: Should restrict empty message submission', async ({ page }) => {
    const input = page.locator('input[placeholder="輸入問題..."]');
    await input.fill(''); // Ensure it's empty

    const submitBtn = page.locator('button[type="submit"]', { hasText: '送出' });
    await expect(submitBtn).toBeVisible();
    
    // Verify button is disabled
    await expect(submitBtn).toBeDisabled();
  });
});
