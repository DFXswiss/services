# URL Availability Report - dfx.swiss/images/app

## Summary
**Check Date:** 2025-08-27  
**Total URLs Checked:** 102  
**Available:** 97 (95.1%)  
**Missing:** 5 (4.9%)

---

## ✅ Available URLs (97 total)

### Static Images (11/12 available)
- ✓ `berge.jpg` - Background image
- ✓ `frankencoin_services.jpg` - Frankencoin background
- ✓ `marcsteiner.png` - Marc Steiner background
- ✓ `OnRamper.jpg` - OnRamper background
- ✓ `chainreport.jpg` - Chain report background
- ✓ `btc-app.jpg` - BTC app instruction
- ✓ `trezorready_en.jpg` - Trezor setup instruction
- ✓ `bitboxready_en.jpg` - BitBox setup instruction
- ✓ `ledgerbtcready_en.jpg` - Ledger BTC setup
- ✓ `ledgerethready_en.jpg` - Ledger ETH setup
- ✓ `iframe.png` - Documentation image

### Wallet Icons (24/24 available - 100%)
All wallet icons are available:
- CakeWallet.webp
- Frankencoin.webp
- Phoenix.webp
- WalletofSatoshi.webp
- BTCTaroDFX.webp
- BitBanana.webp
- Bitkit.webp
- Blink.webp
- BlitzWalletApp.webp
- Blixt.webp
- Breez.webp
- CoinCorner.webp
- DeuroWallet.webp
- LifPay.webp
- lipawallet.webp
- LNbits.webp
- aqua.webp
- OneKey.webp
- Pouchph.webp
- ZEBEDEE.webp
- Zeus.webp
- BinanceApp.webp
- Muun.webp
- KucoinApp.webp

### Tile Images (62/62 tested - 100%)
All tested tile images are available, including:

**Navigation tiles:**
- kaufen, verkaufen, swap (all languages tested)

**Blockchain tiles:**
- bitcoinlightning, ethereum, monero, solanachain, tron
- arbitrum, polygon, optimism, basechain, gnosis
- binancesmartchainchain, evmchain

**Asset tiles:**
- eth, wbtc, usdt, usdc, dai, stablecoin
- frankencoin, deuro, deps, ndeps, fps
- Pol, bnb, xdai, sand, trx, xchf

**Wallet tiles:**
- metamaskrabby, walletconnect, hardwarewallets
- bitbox, ledger, trezor, alby, phantom
- trust, tronlink, cake, monerowallet
- bitcoinapp, mail, command

**Special tiles:**
- kaufen_simple, verkaufen_simple, bitcoinlightning_simple
- ethereumarbitrumoptimismpolygon, ethereumarbitrumoptimismpolygon_simple
- othersethereum, othersarbitrum, othersoptimism, othersbinancesmartchain
- kaufenbitcoinlightningonly, polygonWFPS

---

## ❌ Missing URLs (5 total)

### Static Images (1 missing)
- ❌ `ledgersolready_en.jpg` - Ledger Solana setup instruction
  - **Location:** src/components/home/wallet/connect-ledger.tsx
  - **Impact:** Users setting up Ledger for Solana will not see the instruction image

### App Store Badges (4 missing - 100% missing)
- ❌ `app-store_en.svg` - English App Store badge
- ❌ `app-store_de.svg` - German App Store badge  
- ❌ `play-store_en.svg` - English Play Store badge
- ❌ `play-store_de.svg` - German Play Store badge
  - **Location:** src/util/app-store-badges.ts
  - **Impact:** App store download badges will not display

---

## Recommendations

### High Priority
1. **Upload missing App Store badges** - All 4 badge files are missing and needed for app download links
2. **Add Ledger Solana setup image** - `ledgersolready_en.jpg` is referenced but missing

### Medium Priority
1. **Verify badge file format** - Check if badges should be `.svg` or another format
2. **Consider adding fallback images** for missing files

### Low Priority
1. All other images are working correctly (95.1% availability rate)
2. The migration from `content.dfx.swiss` to `dfx.swiss` appears successful for most assets

---

## Technical Notes

- All wallet icons were successfully migrated from `/wallets/` subfolder to root `/app/` folder
- Tile images support multiple languages (tested with _de and _en suffixes)
- Most dynamic tile images are correctly available on the server
- The new URL structure `https://dfx.swiss/images/app/` is functional