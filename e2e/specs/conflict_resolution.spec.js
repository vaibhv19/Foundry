const { test, expect } = require('@playwright/test');

test.describe('Conflict Resolution and Overrides Flow', () => {
  test('should trigger consistency conflict and successfully override decision', async ({ page }) => {
    const timestamp = Date.now();
    const email = `conflict_user_${timestamp}@example.com`;
    const name = `Conflict User ${timestamp}`;
    const password = 'Password123';

    // 1. Register a new user
    await page.goto('/register');
    await page.getByPlaceholder('Alex Smith').fill(name);
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. Submit a startup idea to generate a blueprint with PostgreSQL as active database
    await page.getByPlaceholder('Describe your startup idea in detail').fill('An online store for gourmet coffee beans.');
    await page.click('button:has-text("Forge Blueprint")');

    // 3. Wait for debate to finish and Canvas workspace to load
    await expect(page).toHaveURL(/\/editor\//);
    test.setTimeout(90000);
    await expect(page.locator('text=Interactive Canvas')).toBeVisible({ timeout: 60000 });

    // 4. Click the "Edit" button on the Technical Architecture block
    await page.locator('button:has-text("Edit")').nth(2).click();

    // 5. Verify the Rewrite Sidebar is open
    await expect(page.locator('text=Rewrite Instructions')).toBeVisible();

    // 6. Enter instructions that conflict with the database decision (e.g. Switch to MongoDB)
    await page.getByPlaceholder('Tell the agents what to change').fill('We need to switch to MongoDB for unstructured analytics.');
    await page.click('button:has-text("Submit Rewrite")');

    // 7. Verify the Consistency Conflict banner displays in the Right Rail
    await expect(page.locator('text=Consistency Conflict!')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Proposed Choice: MongoDB')).toBeVisible();

    // 8. Click "Proceed & Override" to open the rationale modal
    await page.click('button:has-text("Proceed & Override")');
    await expect(page.locator('text=Override Rationale')).toBeVisible();

    // 9. Input rationale and confirm override submit
    await page.getByPlaceholder('State the rationale for this decision override...').fill('Scale requirements for metadata');
    await page.click('button:has-text("Confirm & Re-submit")');

    // 10. Verify that the conflict is resolved and the banner disappears
    await expect(page.locator('text=Consistency Conflict!')).not.toBeVisible({ timeout: 20000 });
  });
});
