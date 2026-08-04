const { test, expect } = require('@playwright/test');

test.describe('Pricing Tier Rate Limits Flow', () => {
  test('should trigger 429 Too Many Requests when rate limits are exceeded for Free users', async ({ page }) => {
    const timestamp = Date.now();
    // Use the special @throttle.com domain to trigger low rate limit behavior
    const email = `throttle_user_${timestamp}@throttle.com`;
    const name = `Throttle User ${timestamp}`;
    const password = 'Password123';

    // 1. Register a new user
    await page.goto('/register');
    await page.getByPlaceholder('Alex Smith').fill(name);
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. Set up listener to catch the 429 rate limit response
    const throttlePromise = page.waitForResponse(response => 
      response.status() === 429
    );

    // 3. Submit a startup idea (1st request)
    await page.getByPlaceholder('Describe your startup idea in detail').fill('A simple dashboard tool.');
    await page.click('button:has-text("Forge Blueprint")');

    // 4. Once it attempts redirect/fetch (subsequent request), it should get throttled (429)
    const throttledResponse = await throttlePromise;
    expect(throttledResponse.status()).toBe(429);
  });
});
