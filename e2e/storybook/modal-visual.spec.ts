import { test, expect } from '@playwright/test';

// Visual regression guard for the shared <Modal> component.
//
// Background: PR #1048 silently changed the Modal default variant from
// fullscreen to dialog, breaking every fullscreen modal in production
// (KYC, Safe Deposit, Buy/Sell, recall, limit request, chargeback)
// until PR #1090 reintroduced an explicit variant prop.
//
// Each story is rendered headless against the built Storybook bundle and
// pixel-diffed against a committed baseline. The Default story is the
// crucial regression guard: it renders <Modal> without passing a variant,
// so any future default flip diverges its snapshot from the explicit
// Fullscreen baseline and fails CI before merge.

const STORYBOOK_VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
} as const;

const STORIES = [
  { id: 'components-modal--default', name: 'modal-default' },
  { id: 'components-modal--fullscreen', name: 'modal-fullscreen' },
  { id: 'components-modal--dialog', name: 'modal-dialog' },
] as const;

for (const story of STORIES) {
  for (const [viewportName, viewport] of Object.entries(STORYBOOK_VIEWPORTS)) {
    test(`${story.name} @ ${viewportName}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);

      // Story root must be mounted before we look for the modal portal.
      await page.locator('#storybook-root').waitFor({ state: 'visible' });

      // The Modal portal lands on document.body; wait for its outer wrapper
      // (`z-50` is on both variants) to ensure the component has reached
      // its second render after `mounted` and refs have been set.
      await page.locator('div.z-50').waitFor({ state: 'visible' });

      // Fonts must be ready or text rendering shifts subpixels between runs.
      await page.evaluate(() => document.fonts.ready);

      // Modal's fullscreen variant computes `topOffset` from a ResizeObserver
      // on documentElement which fires asynchronously after the initial paint.
      // Wait two animation frames so the re-render with the final `top` style
      // has been committed before the snapshot is taken.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );

      await expect(page).toHaveScreenshot(`${story.name}-${viewportName}.png`, {
        fullPage: true,
      });
    });
  }
}
