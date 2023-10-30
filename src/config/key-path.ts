export enum BitcoinAddressType {
  TAPROOT = 'Taproot',
  NATIVE_SEGWIT = 'Native SegWit',
  SEGWIT = 'SegWit',
  LEGACY = 'Legacy',
}

const BitcoinAddressStandard = {
  [BitcoinAddressType.TAPROOT]: 'tr(@0/**)',
  [BitcoinAddressType.NATIVE_SEGWIT]: 'wpkh(@0/**)',
  [BitcoinAddressType.SEGWIT]: 'sh(wpkh(@0/**))',
  [BitcoinAddressType.LEGACY]: 'pkh(@0/**)',
};

export const BitcoinAddressPrefix = {
  [BitcoinAddressType.TAPROOT]: 86,
  [BitcoinAddressType.NATIVE_SEGWIT]: 84,
  [BitcoinAddressType.SEGWIT]: 49,
  [BitcoinAddressType.LEGACY]: 44,
};

const btcRootPath = "'/0'/0'";
const ethRootPath = "44'/60'/0'";

const KeyPath = {
  BTC: (type: BitcoinAddressType) => ({
    root: `${BitcoinAddressPrefix[type]}${btcRootPath}`,
    xPub: `m/${BitcoinAddressPrefix[type]}${btcRootPath}`,
    address: (index: number) => `m/${BitcoinAddressPrefix[type]}${btcRootPath}/0/${index}`,
    addressStandard: BitcoinAddressStandard[type],
  }),
  ETH: {
    root: ethRootPath,
    xPub: `m/${ethRootPath}`,
    address: (index: number) => `m/${ethRootPath}/0/${index}`,
  },
};

export default KeyPath;
