import { test, expect } from '@playwright/test';

test.describe('Daily Self-Scores Feature E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete patient score submission workflow', async ({ page }) => {
    // Step 1: Navigate to login and authenticate as patient
    await page.click('text=Login');
    await expect(page).toHaveURL('/login');

    // Fill in patient credentials
    await page.fill('input[name="username"]', 'testpatient');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Wait for successful login and redirect
    await expect(page).toHaveURL('/patient-dashboard');

    // Step 2: Navigate to the daily self-scores page
    await page.click('text=Daily Self-Scores');
    await expect(page).toHaveURL('/daily-self-scores');

    // Verify page loaded with score sliders
    await expect(page.locator('text=Daily Self-Scores')).toBeVisible();
    await expect(page.locator('[data-testid="diet-slider"]')).toBeVisible();
    await expect(page.locator('[data-testid="exercise-slider"]')).toBeVisible();
    await expect(page.locator('[data-testid="medication-slider"]')).toBeVisible();

    // Step 3: Interact with slider components to set new values
    // Set diet score to 8
    const dietSlider = page.locator('[data-testid="diet-slider"] input[type="range"]');
    await dietSlider.fill('8');
    await expect(page.locator('[data-testid="diet-score-display"]')).toContainText('8');

    // Set exercise score to 6
    const exerciseSlider = page.locator('[data-testid="exercise-slider"] input[type="range"]');
    await exerciseSlider.fill('6');
    await expect(page.locator('[data-testid="exercise-score-display"]')).toContainText('6');

    // Set medication score to 9
    const medicationSlider = page.locator('[data-testid="medication-slider"] input[type="range"]');
    await medicationSlider.fill('9');
    await expect(page.locator('[data-testid="medication-score-display"]')).toContainText('9');

    // Step 4: Click the "Submit My Scores" button
    const submitButton = page.locator('button:has-text("Submit My Scores")');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Step 5: Wait for and verify success toast appears
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast:has-text("Scores Submitted!")')).toBeVisible();

    // Verify success message content
    await expect(page.locator('text=Your daily scores have been recorded successfully')).toBeVisible();

    // Verify the submit button is now disabled (once-per-day enforcement)
    await expect(submitButton).toBeDisabled();
    await expect(page.locator('text=You have already submitted')).toBeVisible();
  });

  test('should prevent duplicate submissions on same day', async ({ page }) => {
    // Login as patient
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testpatient');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/patient-dashboard');

    // Navigate to scores page
    await page.click('text=Daily Self-Scores');
    await expect(page).toHaveURL('/daily-self-scores');

    // If scores already submitted today, verify UI state
    const submitButton = page.locator('button:has-text("Submit My Scores")');
    const alreadySubmittedMessage = page.locator('text=You have already submitted');

    if (await alreadySubmittedMessage.isVisible()) {
      // Scores already submitted - verify disabled state
      await expect(submitButton).toBeDisabled();
      await expect(alreadySubmittedMessage).toBeVisible();
    } else {
      // No scores submitted yet - complete submission then verify prevention
      await page.locator('[data-testid="diet-slider"] input').fill('7');
      await page.locator('[data-testid="exercise-slider"] input').fill('7');
      await page.locator('[data-testid="medication-slider"] input').fill('7');
      
      await submitButton.click();
      await expect(page.locator('.toast:has-text("Scores Submitted!")')).toBeVisible();
      
      // Refresh page and verify submission is prevented
      await page.reload();
      await expect(submitButton).toBeDisabled();
      await expect(alreadySubmittedMessage).toBeVisible();
    }
  });

  test('should display AI analysis after score submission', async ({ page }) => {
    // Login and navigate to scores
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testpatient');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    await page.click('text=Daily Self-Scores');
    await expect(page).toHaveURL('/daily-self-scores');

    // Check if scores can be submitted (not already submitted today)
    const submitButton = page.locator('button:has-text("Submit My Scores")');
    
    if (await submitButton.isEnabled()) {
      // Submit new scores
      await page.locator('[data-testid="diet-slider"] input').fill('5');
      await page.locator('[data-testid="exercise-slider"] input').fill('4');
      await page.locator('[data-testid="medication-slider"] input').fill('8');
      
      await submitButton.click();
      await expect(page.locator('.toast:has-text("Scores Submitted!")')).toBeVisible();

      // Wait for AI analysis dialog to appear
      await expect(page.locator('[data-testid="ai-analysis-dialog"]')).toBeVisible({ timeout: 10000 });
      
      // Verify analysis contains relevant content
      const analysisContent = page.locator('[data-testid="ai-analysis-content"]');
      await expect(analysisContent).toBeVisible();
      await expect(analysisContent).toContainText(/diet|exercise|medication/i);
      
      // Close analysis dialog
      await page.click('[data-testid="close-analysis"]');
      await expect(page.locator('[data-testid="ai-analysis-dialog"]')).not.toBeVisible();
    }
  });

  test('should validate score ranges and display errors', async ({ page }) => {
    // Login and navigate to scores
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testpatient');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    await page.click('text=Daily Self-Scores');

    // Test slider boundaries (should be constrained to 1-10)
    const dietSlider = page.locator('[data-testid="diet-slider"] input[type="range"]');
    
    // Verify slider min/max attributes
    await expect(dietSlider).toHaveAttribute('min', '1');
    await expect(dietSlider).toHaveAttribute('max', '10');
    
    // Test that values outside range are constrained
    await dietSlider.fill('15');
    const displayedValue = await page.locator('[data-testid="diet-score-display"]').textContent();
    expect(parseInt(displayedValue || '0')).toBeLessThanOrEqual(10);
    
    await dietSlider.fill('0');
    const constrainedValue = await page.locator('[data-testid="diet-score-display"]').textContent();
    expect(parseInt(constrainedValue || '0')).toBeGreaterThanOrEqual(1);
  });
});