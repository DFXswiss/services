const btcRootPath = "84'/0'/0'";
const ethRootPath = "44'/60'/0'";
const addressIndex = '0/0';

const KeyPath = {
  BTC: {
    root: btcRootPath,
    xPub: `m/${btcRootPath}`,
    address: `m/${btcRootPath}/${addressIndex}`,
  },
  ETH: {
    root: ethRootPath,
    xPub: `m/${ethRootPath}`,
    address: `m/${ethRootPath}/${addressIndex}`,
  },
};

export default KeyPath;
