const { test, expect } = require('@playwright/test');

test.describe('Initial Generation Flow', () => {
  test('should register, submit an idea, and observe streaming to convergence', async ({ page }) => {
    const timestamp = Date.now();
    const email = `e2e_user_${timestamp}@example.com`;
    const name = `E2E User ${timestamp}`;
    const password = 'Password123';

    // 1. Navigate to registration
    await page.goto('/register');
    await expect(page).toHaveTitle('Foundry');

    // 2. Fill registration details
    await page.getByPlaceholder('Alex Smith').fill(name);
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);

    // 3. Register user
    await page.click('button[type="submit"]');

    // 4. Verify Dashboard page loads
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Forge a New Startup Plan')).toBeVisible();

    // 5. Submit new startup idea
    const ideaText = `A premium organic chocolate subscriptions brand for dark chocolate lovers, sourcing single-origin beans ${timestamp}`;
    await page.getByPlaceholder('Describe your startup idea in detail').fill(ideaText);
    await page.click('button:has-text("Forge Blueprint")');

    // 6. Verify URL is redirected to the Editor workspace
    await expect(page).toHaveURL(/\/editor\//);

    // 7. Verify Strategy Room starts debate
    await expect(page.locator('text=Strategy Room Live Debate Log')).toBeVisible();
    await expect(page.locator('text=Agents are debating...')).toBeVisible();

    // 8. Wait for debate to converge (Interactive Canvas renders)
    // Increase timeout since LLM agent calls take time to run and stream
    test.setTimeout(120000);
    await expect(page.locator('text=Interactive Canvas')).toBeVisible({ timeout: 95000 });

    // 9. Verify Decision Log panel renders
    await expect(page.locator('text=Decision Log')).toBeVisible();
  });
});
