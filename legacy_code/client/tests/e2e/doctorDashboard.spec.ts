import { test, expect } from '@playwright/test';

test.describe('Doctor Dashboard CPD Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete doctor CPD management workflow', async ({ page }) => {
    // Step 1: Login as doctor
    await page.click('text=Login');
    await expect(page).toHaveURL('/login');

    // Fill in doctor credentials
    await page.fill('input[name="username"]', 'testdoctor');
    await page.fill('input[name="password"]', 'doctorpassword');
    await page.click('button[type="submit"]');

    // Wait for successful login and redirect to doctor dashboard
    await expect(page).toHaveURL('/doctor-dashboard');

    // Step 2: Navigate to the doctor dashboard (already there)
    await expect(page.locator('text=Doctor Dashboard')).toBeVisible();
    await expect(page.locator('text=Patient Management')).toBeVisible();

    // Verify patients list is loaded
    await expect(page.locator('[data-testid="patients-list"]')).toBeVisible();

    // Step 3: Click on a test patient
    const firstPatient = page.locator('[data-testid="patient-card"]').first();
    await expect(firstPatient).toBeVisible();
    await firstPatient.click();

    // Verify patient details panel opens
    await expect(page.locator('[data-testid="patient-details-panel"]')).toBeVisible();
    await expect(page.locator('text=Care Plan Directives')).toBeVisible();

    // Step 4: Type a new Care Plan Directive into the 'Diet' textarea
    const dietTextarea = page.locator('[data-testid="diet-cpd-textarea"]');
    await expect(dietTextarea).toBeVisible();

    const newDietDirective = 'Follow a Mediterranean diet with emphasis on lean proteins, whole grains, and fresh vegetables. Limit processed foods and maintain 6 small meals per day.';
    
    // Clear existing content and type new directive
    await dietTextarea.clear();
    await dietTextarea.fill(newDietDirective);

    // Verify the text was entered correctly
    await expect(dietTextarea).toHaveValue(newDietDirective);

    // Step 5: Click the "Save CPDs" button
    const saveCpdsButton = page.locator('button:has-text("Save CPDs")');
    await expect(saveCpdsButton).toBeEnabled();
    await saveCpdsButton.click();

    // Wait for success notification
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast:has-text("Care Plan Directives saved successfully")')).toBeVisible();

    // Step 6: Refresh the page and verify the new text has persisted
    await page.reload();

    // Wait for page to reload and navigate back to the same patient
    await expect(page).toHaveURL('/doctor-dashboard');
    await expect(page.locator('[data-testid="patients-list"]')).toBeVisible();

    // Click on the same patient again
    await page.locator('[data-testid="patient-card"]').first().click();
    await expect(page.locator('[data-testid="patient-details-panel"]')).toBeVisible();

    // Verify the diet directive persisted
    const persistedDietTextarea = page.locator('[data-testid="diet-cpd-textarea"]');
    await expect(persistedDietTextarea).toHaveValue(newDietDirective);
  });

  test('should update exercise and medication CPDs', async ({ page }) => {
    // Login as doctor
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testdoctor');
    await page.fill('input[name="password"]', 'doctorpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/doctor-dashboard');

    // Select first patient
    await page.locator('[data-testid="patient-card"]').first().click();
    await expect(page.locator('[data-testid="patient-details-panel"]')).toBeVisible();

    // Update exercise CPD
    const exerciseTextarea = page.locator('[data-testid="exercise-cpd-textarea"]');
    const exerciseDirective = 'Engage in 30 minutes of moderate cardio 5 times per week. Include strength training twice weekly focusing on major muscle groups.';
    await exerciseTextarea.clear();
    await exerciseTextarea.fill(exerciseDirective);

    // Update medication CPD
    const medicationTextarea = page.locator('[data-testid="medication-cpd-textarea"]');
    const medicationDirective = 'Take Metformin 500mg twice daily with meals. Monitor blood glucose levels and report readings weekly.';
    await medicationTextarea.clear();
    await medicationTextarea.fill(medicationDirective);

    // Save all CPDs
    await page.click('button:has-text("Save CPDs")');
    await expect(page.locator('.toast:has-text("Care Plan Directives saved successfully")')).toBeVisible();

    // Verify persistence after refresh
    await page.reload();
    await page.locator('[data-testid="patient-card"]').first().click();
    
    await expect(page.locator('[data-testid="exercise-cpd-textarea"]')).toHaveValue(exerciseDirective);
    await expect(page.locator('[data-testid="medication-cpd-textarea"]')).toHaveValue(medicationDirective);
  });

  test('should display patient basic information', async ({ page }) => {
    // Login as doctor
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testdoctor');
    await page.fill('input[name="password"]', 'doctorpassword');
    await page.click('button[type="submit"]');

    // Verify patient list displays essential information
    const patientCard = page.locator('[data-testid="patient-card"]').first();
    await expect(patientCard).toBeVisible();

    // Check for patient name, email, and phone
    await expect(patientCard.locator('[data-testid="patient-name"]')).toBeVisible();
    await expect(patientCard.locator('[data-testid="patient-email"]')).toBeVisible();
    await expect(patientCard.locator('[data-testid="patient-phone"]')).toBeVisible();

    // Click to expand details
    await patientCard.click();
    await expect(page.locator('[data-testid="patient-details-panel"]')).toBeVisible();

    // Verify detailed patient information is displayed
    await expect(page.locator('[data-testid="patient-details-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-details-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-details-phone"]')).toBeVisible();
  });

  test('should generate Patient Progress Report', async ({ page }) => {
    // Login as doctor
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testdoctor');
    await page.fill('input[name="password"]', 'doctorpassword');
    await page.click('button[type="submit"]');

    // Select patient and open details
    await page.locator('[data-testid="patient-card"]').first().click();
    await expect(page.locator('[data-testid="patient-details-panel"]')).toBeVisible();

    // Click on Generate PPR button
    const generatePprButton = page.locator('button:has-text("Generate PPR")');
    await expect(generatePprButton).toBeVisible();
    await generatePprButton.click();

    // Wait for PPR generation (may take a few seconds due to AI processing)
    await expect(page.locator('.toast:has-text("Generating Patient Progress Report")')).toBeVisible();
    
    // Wait for completion
    await expect(page.locator('.toast:has-text("PPR generated successfully")')).toBeVisible({ timeout: 15000 });

    // Verify PPR dialog appears
    await expect(page.locator('[data-testid="ppr-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="ppr-content"]')).toBeVisible();

    // Verify PPR contains relevant sections
    const pprContent = page.locator('[data-testid="ppr-content"]');
    await expect(pprContent).toContainText(/patient progress|health metrics|recommendations/i);

    // Close PPR dialog
    await page.click('[data-testid="close-ppr"]');
    await expect(page.locator('[data-testid="ppr-dialog"]')).not.toBeVisible();
  });

  test('should validate CPD text length limits', async ({ page }) => {
    // Login as doctor
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testdoctor');
    await page.fill('input[name="password"]', 'doctorpassword');
    await page.click('button[type="submit"]');

    // Select patient
    await page.locator('[data-testid="patient-card"]').first().click();

    // Test extremely long text (should be handled gracefully)
    const veryLongText = 'A'.repeat(2000);
    const dietTextarea = page.locator('[data-testid="diet-cpd-textarea"]');
    await dietTextarea.fill(veryLongText);

    // Attempt to save
    await page.click('button:has-text("Save CPDs")');

    // Should either accept (if no limit) or show validation error
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    
    // Text should either be saved successfully or show appropriate error
    const toastText = await toast.textContent();
    expect(toastText).toMatch(/(saved successfully|too long|limit exceeded)/i);
  });
});