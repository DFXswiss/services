import { PaymentStandardType } from '@dfx.swiss/react/dist/definitions/route';

export const PaymentStandards = {
  [PaymentStandardType.OPEN_CRYPTO_PAY]: {
    id: PaymentStandardType.OPEN_CRYPTO_PAY,
    label: 'OpenCryptoPay.io',
    description: 'Pay with OpenCryptoPay, Bitcoin Lightning LNURL',
    paymentIdentifierLabel: 'URL',
  },
  [PaymentStandardType.LIGHTNING_BOLT11]: {
    id: PaymentStandardType.LIGHTNING_BOLT11,
    label: 'Bitcoin Lightning',
    description: 'Pay with a Bolt 11 Invoice',
    paymentIdentifierLabel: 'LNR',
  },

  [PaymentStandardType.PAY_TO_ADDRESS]: {
    id: PaymentStandardType.PAY_TO_ADDRESS,
    label: '{{blockchain}} address',
    description: 'Pay to a {{blockchain}} Blockchain address',
    paymentIdentifierLabel: 'URI',
  },
};

export interface WalletInfo {
  name: string;
  websiteUrl: string;
  iconUrl: string;
  deepLink?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  recommended?: boolean;
}

export const paymentLinkWallets: WalletInfo[] = [
  // ----------------------- RECOMMENDED WALLETS -----------------------
  {
    name: 'Cake Wallet',
    websiteUrl: 'https://cakewallet.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/CakeWallet.webp',
    deepLink: 'cakewallet://',
    appStoreUrl: 'https://apps.apple.com/us/app/cake-wallet-for-xmr-monero/id1334702542',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.cakewallet.cake_wallet',
    recommended: true,
  },
  {
    name: 'Frankencoin',
    websiteUrl: 'https://frankencoin.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Frankencoin.webp',
    recommended: true,
  },
  {
    name: 'Phoenix',
    websiteUrl: 'https://phoenix.acinq.co/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Phoenix.webp',
    recommended: true,
  },
  {
    name: 'Wallet of Satoshi',
    websiteUrl: 'https://www.walletofsatoshi.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/WalletofSatoshi.webp',
    recommended: true,
  },
  {
    name: 'BtcTaro',
    websiteUrl: 'https://dfx.swiss/bitcoin.html',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BTCTaroDFX.webp',
    deepLink: 'btctaro://',
    appStoreUrl: 'https://apps.apple.com/app/btc-taro/id1234567890',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=swiss.dfx.btctaro',
    recommended: true,
  },
  // ----------------------- OTHER COMPATIBLE WALLETS -----------------------
  {
    name: 'BitBanana',
    websiteUrl: 'https://bitbanana.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BitBanana.webp',
  },
  {
    name: 'Bitkit',
    websiteUrl: 'https://bitkit.to/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Bitkit.webp',
  },
  {
    name: 'Blink',
    websiteUrl: 'https://de.blink.sv/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Blink.webp',
  },
  {
    name: 'Blitz Wallet',
    websiteUrl: 'https://blitz-wallet.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BlitzWalletApp.webp',
  },
  {
    name: 'Blixt',
    websiteUrl: 'https://blixtwallet.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Blixt.webp',
  },
  {
    name: 'BlueWallet',
    websiteUrl: 'https://bluewallet.io/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BlueWallet.webp',
  },
  {
    name: 'Breez',
    websiteUrl: 'https://breez.technology/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Breez.webp',
  },
  {
    name: 'CoinCorner',
    websiteUrl: 'https://www.coincorner.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/CoinCorner.webp',
  },
  {
    name: 'Electrum',
    websiteUrl: 'https://electrum.org/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Electrum.webp',
  },
  {
    name: 'LifPay',
    websiteUrl: 'https://lifpay.me/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LifPay.webp',
  },
  {
    name: 'LipaWallet',
    websiteUrl: 'https://lipa.swiss/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/lipawallet.webp',
  },
  {
    name: 'LNbits',
    websiteUrl: 'https://lnbits.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LNbits.webp',
  },
  {
    name: 'AQUA',
    websiteUrl: 'https://aquawallet.io/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/aqua.webp',
  },
  {
    name: 'OneKey',
    websiteUrl: 'https://onekey.so/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/OneKey.webp',
  },
  {
    name: 'PouchPH',
    websiteUrl: 'https://pouch.ph/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Pouchph.webp',
  },
  {
    name: 'ZEBEDEE',
    websiteUrl: 'https://zbd.gg/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/ZEBEDEE.webp',
  },
  {
    name: 'Zeus',
    websiteUrl: 'https://zeusln.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Zeus.webp',
  },
];
