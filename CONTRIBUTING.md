# Contributing

## Testing

### Unit tests

```
npm run test
```

Unit tests run in CI on every pull request and must pass.

### Visual regression tests (Playwright)

The Playwright end-to-end tests under `e2e/` render the app and compare
screenshots against committed baselines in `e2e/screenshots/baseline/`.

**These tests are a local development and code-review aid. They intentionally do
NOT run in CI.**

Their purpose is review quality: when a change affects the UI, the author
regenerates the affected screenshots locally and commits them together with the
change. The reviewer then sees the visual difference (before → after) directly in
the pull-request diff, instead of having to infer it from the code. Running them
in CI would add no value for that purpose and would be flaky — the baselines are
platform-, font- and data-dependent — needlessly blocking PRs.

#### Workflow

1. Start the local stack. See the API repository's README quick start (local
   database via `docker compose up -d`, then `npm run setup`). The API and this
   repository must be checked out as sibling folders.
2. Run the relevant test(s) against the local API:
   ```
   REACT_APP_API_URL=http://localhost:3000 npx playwright test <spec> --project=chromium
   ```
3. When your change affects the UI, regenerate the affected screenshots and commit
   them with the change:
   ```
   npx playwright test <spec> -g "<test title>" --update-snapshots
   ```

#### Rules

- Regenerate only the screenshots your change actually affects — never update all
  baselines at once.
- Baselines are platform-specific (`*-chromium-darwin.png`); generate them on the
  same platform as the existing ones (macOS).
- Baselines for screens you did not touch may not match the current app, because
  the screen or the local seed data has drifted since the baseline was taken. That
  is expected — these tests are not a regression gate and do not fail the build.
- For a clean, reviewable diff, regenerate on a realistic data set so the
  screenshot isolates your actual UI change rather than seed-data noise.

## Agent skills

Shared agent skills live under `skills/<name>/` and are version-controlled so the whole team gets them
on pull. They follow the open [Agent Skills](https://agentskills.io) `SKILL.md` standard, so they are
not tied to a single tool. Point your agent at the `skills/` directory — symlink or copy
`skills/<name>/` into your agent's skills folder, or set the path in your agent's config; per-developer
agent config stays local. Keep `SKILL.md` frontmatter to the portable core (`name`, `description`) and
reference scripts by repository-relative path.

Current skills:

- `skills/synpress-e2e/` — run the MetaMask wallet e2e suite (pinned Chrome 126 / MetaMask 11.9.1,
  headed, serial).
- `skills/visual-baselines/` — regenerate Playwright visual baselines after a UI change (see "Visual
  regression tests" above).
