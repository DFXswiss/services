import { test } from '@playwright/test';

test('check console for errors and warnings', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('\n========== ERRORS ==========');
  if (errors.length === 0) {
    console.log('✅ Keine Fehler gefunden!');
  } else {
    errors.forEach(e => console.log(`❌ ${e}`));
  }
  
  console.log('\n========== WARNINGS ==========');
  if (warnings.length === 0) {
    console.log('✅ Keine Warnungen gefunden!');
  } else {
    warnings.forEach(w => console.log(`⚠️  ${w}`));
  }
});
