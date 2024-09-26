export enum PaymentStandardType {
  OPEN_CRYPTO_PAY = 'OpenCryptoPay',
  FRANKENCOIN_PAY = 'FrankencoinPay',
  LIGHTNING_BOLT11 = 'LightningBolt11',
  PAY_TO_ADDRESS = 'PayToAddress',
}

export const PaymentStandards = {
  [PaymentStandardType.OPEN_CRYPTO_PAY]: {
    id: PaymentStandardType.OPEN_CRYPTO_PAY,
    label: 'OpenCryptoPay.io',
    description: 'Pay with OpenCryptoPay, Bitcoin Lightning LNURL',
    paymentIdentifierLabel: 'URL',
  },
  [PaymentStandardType.FRANKENCOIN_PAY]: {
    id: PaymentStandardType.FRANKENCOIN_PAY,
    label: 'FrankencoinPay.com',
    description: 'Pay with FrankencoinPay, Bitcoin Lightning LNURL',
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

export const RecommendedWallets = ['Frankencoin', 'Phoenix', 'Wallet of Satoshi', 'BtcTaro'];

export const CompatibleWallets: { [key: string]: { websiteUrl: string; iconUrl: string; recommended?: boolean } } = {
  BitBanana: {
    websiteUrl: 'https://bitbanana.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BitBanana.webp',
  },
  Bitkit: {
    websiteUrl: 'https://bitkit.to/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Bitkit.webp',
  },
  Blink: {
    websiteUrl: 'https://de.blink.sv/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Blink.webp',
  },
  Blixt: {
    websiteUrl: 'https://blixtwallet.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Blixt.webp',
  },
  BlueWallet: {
    websiteUrl: 'https://bluewallet.io/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BlueWallet.webp',
  },
  Breez: {
    websiteUrl: 'https://breez.technology/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Breez.webp',
  },
  BtcTaro: {
    websiteUrl: 'https://dfx.swiss/bitcoin.html',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BTCTaroDFX.webp',
  },
  CoinCorner: {
    websiteUrl: 'https://www.coincorner.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/CoinCorner.webp',
  },
  Electrum: {
    websiteUrl: 'https://electrum.org/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Electrum.webp',
  },
  Frankencoin: {
    websiteUrl: 'https://frankencoin.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Frankencoin.webp',
    recommended: true,
  },
  LifPay: {
    websiteUrl: 'https://lifpay.me/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LifPay.webp',
  },
  LipaWallet: {
    websiteUrl: 'https://lipa.swiss/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/lipawallet.webp',
  },
  LNbits: {
    websiteUrl: 'https://lnbits.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LNbits.webp',
  },
  AQUA: {
    websiteUrl: 'https://aquawallet.io/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/aqua.webp',
  },
  OneKey: {
    websiteUrl: 'https://onekey.so/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/OneKey.webp',
  },
  Phoenix: {
    websiteUrl: 'https://phoenix.acinq.co/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Phoenix.webp',
    recommended: true,
  },
  PouchPH: {
    websiteUrl: 'https://pouch.ph/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Pouchph.webp',
  },
  'Wallet of Satoshi': {
    websiteUrl: 'https://www.walletofsatoshi.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/WalletofSatoshi.webp',
    recommended: true,
  },
  ZEBEDEE: {
    websiteUrl: 'https://zbd.gg/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/ZEBEDEE.webp',
  },
  Zeus: {
    websiteUrl: 'https://zeusln.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Zeus.webp',
  },
};
