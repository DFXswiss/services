export enum PaymentStandard {
  OPEN_CRYPTO_PAY = 'OpenCryptoPay',
  FRANKENCOIN_PAY = 'FrankencoinPay',
  LIGHTNING_BOLT11 = 'LightningBolt11',
  PAY_TO_ADDRESS = 'PayToAddress',
}

export const PaymentMethods = {
  [PaymentStandard.OPEN_CRYPTO_PAY]: {
    id: PaymentStandard.OPEN_CRYPTO_PAY,
    label: 'OpenCryptoPay.io',
    description: 'Pay with FrankencoinPay, Bitcoin Lightning LNURL',
    paymentIdentifierLabel: 'LNURL',
  },
  [PaymentStandard.FRANKENCOIN_PAY]: {
    id: PaymentStandard.FRANKENCOIN_PAY,
    label: 'FrankencoinPay.com',
    description: 'Pay with FrankencoinPay, Bitcoin Lightning LNURL',
    paymentIdentifierLabel: 'LNURL',
  },
  [PaymentStandard.LIGHTNING_BOLT11]: {
    id: PaymentStandard.LIGHTNING_BOLT11,
    label: 'Bitcoin Lightning',
    description: 'Pay with a Bolt 11 Invoice',
    paymentIdentifierLabel: 'LNR',
  },

  [PaymentStandard.PAY_TO_ADDRESS]: {
    id: PaymentStandard.PAY_TO_ADDRESS,
    label: '{{blockchain}} address',
    description: 'Pay to a {{blockchain}} Blockchain address',
    paymentIdentifierLabel: 'URI',
  },
};

export const RecommendedWallets = ['Frankencoin', 'Cake Wallet', 'Wallet of Satoshi', 'Phoenix'];

export const CompatibleWallets: { [key: string]: { websiteUrl: string; iconUrl: string; recommended?: boolean } } = {
  Alby: {
    websiteUrl: 'https://getalby.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Alby.webp',
  },
  BareBitcoin: {
    websiteUrl: 'https://barebitcoin.no/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BareBitcoin.webp',
  },
  Bipa: {
    websiteUrl: 'https://bipa.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Bipa.webp',
  },
  BitBanana: {
    websiteUrl: 'https://bitbanana.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BitBanana.webp',
  },
  Bitkit: {
    websiteUrl: 'https://bitkit.to/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Bitkit.webp',
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
  BTCPayServer: {
    websiteUrl: 'https://btcpayserver.org/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/BTCPayServer.webp',
  },
  'Cake Wallet': {
    websiteUrl: 'https://cakewallet.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/4.webp',
    recommended: true,
  },
  CoinCorner: {
    websiteUrl: 'https://www.coincorner.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/CoinCorner.webp',
  },
  Coinos: {
    websiteUrl: 'https://coinos.io/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/coinos.webp',
  },
  Electrum: {
    websiteUrl: 'https://electrum.org/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Electrum.webp',
  },
  Fountain: {
    websiteUrl: 'https://fountainplatform.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Fountain.webp',
  },
  Frankencoin: {
    websiteUrl: 'https://frankencoin.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Frankencoin.webp',
    recommended: true,
  },
  Galoy: {
    websiteUrl: 'https://galoy.io/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Galoy.webp',
  },
  Geyser: {
    websiteUrl: 'https://geyser.fund/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Geyser.webp',
  },
  LifPay: {
    websiteUrl: 'https://lifpay.me/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LifPay.webp',
  },
  LightningTipBot: {
    websiteUrl: 'https://github.com/LightningTipBot/LightningTipBot',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LightningTopBot.webp',
  },
  LipaWallet: {
    websiteUrl: 'https://lipa.swiss/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/lipawallet.webp',
  },
  LNbits: {
    websiteUrl: 'https://lnbits.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/LNbits.webp',
  },
  Machankura: {
    websiteUrl: 'https://8333.mobi/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/Machankura.webp',
  },
  Muun: {
    websiteUrl: 'https://muun.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/muun.webp',
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
  River: {
    websiteUrl: 'https://river.com/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/River.webp',
  },
  ShockWallet: {
    websiteUrl: 'https://shockwallet.app/',
    iconUrl: 'https://content.dfx.swiss/img/v1/services/wallets/ShockWallet.webp',
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
