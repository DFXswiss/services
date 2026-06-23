# Synpress / MetaMask e2e — reference

## Why the versions are pinned
- Chrome `126.0.6478.0` is the last build with Manifest V2 support; MetaMask `11.9.1` is an MV2
  extension. Chrome 127+ deprecates MV2 and the framework's built-in cache breaks there, so the suite
  loads the extension manually (`launchPersistentContext`) on Chrome 126.
- macOS arm64 only: the Chrome binary path is hardcoded as
  `chrome/mac_arm-126.0.6478.0/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/...`.

## Setup commands (package.json)
- `synpress:install-chrome` → `npx @puppeteer/browsers install chrome@126.0.6478.0`
- `synpress:download-metamask` → downloads `metamask-chrome-11.9.1.zip` into
  `.cache-synpress/metamask-chrome-11.9.1`
- `synpress:setup` → runs both.

## Run config (playwright.synpress.config.ts)
- `testDir: ./e2e/synpress`, `headless: false`, `workers: 1`, `fullyParallel: false`,
  `timeout: 120000`, `baseURL: http://localhost:3001`.
- `webServer`: `npm start` on `http://localhost:3001` (reused locally, started in CI).
- `testMatch` (the specs that actually run): `eip5792-custom.spec.ts`, `sepolia-usdt-sell.spec.ts`,
  `sepolia-full-metamask.spec.ts`, `sepolia-real-tx.spec.ts`, `sell-complete.spec.ts`,
  `sepolia-sell-e2e.spec.ts`.

## Wallet constants (e2e/synpress/custom-fixtures.ts)
- Password: `Tester@1234`. Seed: `TEST_SEED` from `.env` (sample mnemonic in `.env.sample`).
- Extension loaded with `--disable-extensions-except` / `--load-extension` from
  `.cache-synpress/metamask-chrome-11.9.1`; locale forced to `en-US`; fresh ephemeral profile per run.
- Sepolia: USDT `0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0`, chainId `11155111`.

## Isolated debug config
- `playwright.metamask-debug.config.ts` runs only `metamask-setup-test.spec.ts` with **no** webServer.
  Use it to verify Chrome-126 + extension loading + wallet import in isolation, without booting the app:
  `npx playwright test --config=playwright.metamask-debug.config.ts`.

## Caveat: two fixture paths
`e2e/synpress/custom-fixtures.ts` (manual Chrome-126 load) is what `test:e2e:metamask` uses. A second,
native-framework path (`fixtures.ts` + `test/wallet-setup/basic.setup.ts`, with a different seed) exists
but is not referenced by the config's `testMatch`, so it does not run under `npm run test:e2e:metamask`.
