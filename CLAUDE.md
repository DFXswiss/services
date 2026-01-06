# Claude Code Guidelines für DFXswiss/services

## Git Workflow

**WICHTIG: NIEMALS direkt auf `develop` oder `main` pushen!**

### Korrekter Ablauf:
1. Feature-Branch erstellen: `git checkout -b feature/beschreibung`
2. Änderungen committen
3. Branch pushen: `git push -u origin feature/beschreibung`
4. Pull Request erstellen via `gh pr create`
5. Nach Review: PR mergen

### Commit-Richtlinien:
- Keine KI-Erwähnungen in Commits (kein "Generated with Claude Code")
- Konventionelle Commit-Messages: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`
- Keine Emojis in Commit-Messages

## E2E Tests

### Synpress/MetaMask Tests ausführen:
```bash
# Wallet-Setup (einmalig):
npx ts-node e2e/synpress/setup-wallet.ts

# Tests ausführen:
PLAYWRIGHT_BROWSERS_PATH=/Users/customer/Library/Caches/ms-playwright \
npx playwright test --config=playwright.synpress.config.ts
```

### Bei fehlgeschlagenen Tests:
Falls MetaMask-State korrupt ist (pending transactions), Wallet neu einrichten:
```bash
rm -rf .cache-synpress/user-data-ready
npx ts-node e2e/synpress/setup-wallet.ts
```
