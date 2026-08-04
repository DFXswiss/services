---
name: visual-baselines
description: Regenerate the Playwright visual-regression baselines in this repo after a UI change. Use when a change alters the rendered UI and the committed screenshot baselines need updating for pull-request review. Regenerate only affected screenshots, never all of them.
---

# Visual baselines (Playwright)

The Playwright tests under `e2e/` compare the rendered app against committed screenshot baselines in
`e2e/screenshots/baseline/`. They are a local pull-request-review aid and intentionally do **not** run
in CI. When a change affects the UI, regenerate the affected baselines locally and commit them with the
change so the reviewer sees the before→after in the PR diff. The full procedure lives in
`CONTRIBUTING.md` ("Visual regression tests"); this is the short, runnable version.

## Prerequisite

Start the local stack (the API repo and this repo checked out as sibling folders; local DB + seed —
see the API repository's README). The frontend runs on `http://localhost:3001`, the API on
`http://localhost:3000`.

## Run / regenerate

Run an affected spec against the local API:

```
REACT_APP_API_URL=http://localhost:3000 npx playwright test <spec> --project=chromium
```

Regenerate only the screenshots your change affects, then commit them:

```
npx playwright test <spec> -g "<test title>" --update-snapshots
```

## Rules

- Regenerate **only** the screenshots your change actually affects — never update all baselines at once.
- Baselines are platform-specific (`*-chromium-darwin.png`); regenerate on macOS, like the existing ones.
- Drift on screens you did not touch is expected — these tests are not a regression gate and do not fail
  the build. Do not "fix" unrelated baselines.
- Regenerate on a realistic seed data set so the diff isolates your actual UI change, not seed-data noise.
