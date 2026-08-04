const { test, expect } = require('@playwright/test');

test.describe('Section Versioning and Rollback Flow', () => {
  test('should support rewriting a section and rolling back to v1', async ({ page }) => {
    const timestamp = Date.now();
    const email = `rollback_user_${timestamp}@example.com`;
    const name = `Rollback User ${timestamp}`;
    const password = 'Password123';

    // 1. Register a new user
    await page.goto('/register');
    await page.getByPlaceholder('Alex Smith').fill(name);
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. Submit a startup idea to generate a blueprint
    await page.getByPlaceholder('Describe your startup idea in detail').fill('A simple SaaS app.');
    await page.click('button:has-text("Forge Blueprint")');

    // 3. Wait for debate to finish and Canvas workspace to load
    await expect(page).toHaveURL(/\/editor\//);
    test.setTimeout(90000);
    await expect(page.locator('text=Interactive Canvas')).toBeVisible({ timeout: 60000 });

    // 4. Locate the Technical Architecture block (3rd Edit button in the grid)
    const editBtn = page.locator('button:has-text("Edit")').nth(2);
    await editBtn.click();

    // 5. Submit a rewrite instructions (e.g. Switch to MongoDB) with override to create v2
    await page.getByPlaceholder('Tell the agents what to change').fill('We need to switch to MongoDB.');
    await page.click('button:has-text("Submit Rewrite")');

    // 6. Since this conflicts with Postgres, proceed & override
    await expect(page.locator('text=Consistency Conflict!')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Proceed & Override")');
    await page.getByPlaceholder('State the rationale for this decision override...').fill('Development efficiency.');
    await page.click('button:has-text("Confirm & Re-submit")');

    // 7. Verify v2 button appears and the new content mentions MongoDB
    await expect(page.locator('button:has-text("v2")')).toBeVisible({ timeout: 20000 });
    const techBlock = page.locator('div:has(> div > div > span:has-text("TECH_STACK"))');
    await expect(techBlock).toContainText('MongoDB');

    // 8. Click the "v1" button to trigger rollback
    await page.locator('button:has-text("v1")').nth(2).click();

    // 9. Verify that v1 is restored and text goes back to Postgres
    await expect(techBlock).toContainText('Postgres');
    await expect(techBlock).not.toContainText('MongoDB');
  });
});
