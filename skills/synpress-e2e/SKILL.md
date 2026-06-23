---
name: synpress-e2e
description: Run the MetaMask wallet end-to-end test suite (Synpress/Playwright) in this repo. Use when running or debugging the on-chain wallet e2e tests — covers the one-time pinned-Chrome + MetaMask setup, the headed/serial run constraints, and the wallet/seed configuration.
---

# MetaMask wallet e2e (Synpress)

The wallet e2e suite drives a real MetaMask extension through Playwright. It needs a pinned browser and
extension and must run headed and serially. The required knowledge is not obvious and is not documented
elsewhere — read this before running it.

## One-time setup

```
npm run synpress:setup
```

This installs **Chrome 126.0.6478.0** (via `@puppeteer/browsers`) and downloads **MetaMask 11.9.1**
into `.cache-synpress/metamask-chrome-11.9.1`. Both versions are pinned on purpose: Chrome 127+ drops
Manifest V2 support and MetaMask 11.9.1 is an MV2 extension, so the suite uses the last MV2-capable
Chrome (126) and loads the extension manually instead of relying on the framework's cache (which breaks
on Chrome 127+). The Chrome binary path is hardcoded for macOS arm64.

## Run the suite

```
npm run test:e2e:metamask
```

This runs Playwright with `playwright.synpress.config.ts`, which starts the app via `npm start` on
`http://localhost:3001` and runs the wallet specs. Hard constraints — do not change them:

- **Headed** (`headless: false`) — MV2 extensions cannot load in headless Chrome.
- **Serial** (`workers: 1`) — the tests share one wallet state.
- Only the specs in the config's `testMatch` run, not every file under `e2e/synpress/`.

## Wallet configuration

- `TEST_SEED` must be set in `.env` (the test wallet's mnemonic); the wallet password is `Tester@1234`.
- The extension is loaded from `.cache-synpress/metamask-chrome-11.9.1` via Playwright's
  `launchPersistentContext` with a fresh ephemeral profile; the wallet is imported on each run.

See `reference.md` in this skill folder for the exact paths, the spec list, the Sepolia constants, and
the isolated extension-loading debug config.
