import { Asset, AssetType, Blockchain } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AssetBalance } from '../../contexts/balance.context';
import ERC20_ABI from '../../static/erc20.abi.json';
import { useBlockchain } from '../blockchain.hook';

export enum WalletType {
  META_MASK = 'MetaMask',
  RABBY = 'Rabby',
}

export interface MetaMaskInterface {
  isInstalled: () => boolean;
  getWalletType: () => WalletType | undefined;
  register: (
    onAccountChanged: (account?: string) => void,
    onBlockchainChanged: (blockchain?: Blockchain) => void,
  ) => void;
  getAccount: () => Promise<string | undefined>;
  requestAccount: () => Promise<string | undefined>;
  requestBlockchain: () => Promise<Blockchain | undefined>;
  requestChangeToBlockchain: (blockchain?: Blockchain) => Promise<void>;
  requestBalance: (account: string) => Promise<string | undefined>;
  sign: (address: string, message: string) => Promise<string>;
  addContract: (asset: Asset, svgData: string, currentBlockchain?: Blockchain) => Promise<boolean>;
  readBalance: (asset: Asset, address?: string) => Promise<AssetBalance>;
  createTransaction: (amount: BigNumber, asset: Asset, from: string, to: string) => Promise<string>;
}

interface MetaMaskError {
  code: number;
  message: string;
}

export interface MetaMaskChainInterface {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export function useMetaMask(): MetaMaskInterface {
  const web3 = new Web3(Web3.givenProvider);
  const { toBlockchain, toChainId, toChainObject } = useBlockchain();

  function ethereum() {
    return (window as any).ethereum;
  }

  function isInstalled(): boolean {
    const eth = ethereum();
    return Boolean(eth && eth.isMetaMask);
  }

  function getWalletType(): WalletType | undefined {
    const eth = ethereum();
    if (eth) {
      if (eth.isRabby) return WalletType.RABBY;
      if (eth.isMetaMask) return WalletType.META_MASK;
    }
  }

  function register(
    onAccountChanged: (account?: string) => void,
    onBlockchainChanged: (blockchain?: Blockchain) => void,
  ) {
    web3.eth.getAccounts((_err, accounts) => {
      onAccountChanged(verifyAccount(accounts));
    });
    web3.eth.getChainId((_err, chainId) => {
      onBlockchainChanged(toBlockchain(chainId));
    });
    ethereum()?.on('accountsChanged', (accounts: string[]) => {
      onAccountChanged(verifyAccount(accounts));
    });
    ethereum()?.on('chainChanged', (chainId: string) => {
      onBlockchainChanged(toBlockchain(chainId));
    });
  }

  async function getAccount(): Promise<string | undefined> {
    return verifyAccount(await web3.eth.getAccounts());
  }

  async function checkConnection(): Promise<void> {
    return timeout(getAccount(), 1000).catch((e) => e.message.includes('Timeout') && window.location.reload());
  }

  async function requestAccount(): Promise<string | undefined> {
    await checkConnection();
    return verifyAccount(await web3.eth.requestAccounts());
  }

  async function requestBlockchain(): Promise<Blockchain | undefined> {
    return toBlockchain(await web3.eth.getChainId());
  }

  async function requestChangeToBlockchain(blockchain?: Blockchain): Promise<void> {
    if (!blockchain) return;

    const chainId = toChainId(blockchain);
    if (!chainId) return;

    return ethereum()
      .request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
      .catch((e: MetaMaskError) => {
        // 4902 chain is not yet added to MetaMask, therefore add chainId to MetaMask
        if (e && e.code === 4902) {
          return requestAddChainId(blockchain);
        }

        throw e;
      });
  }

  async function requestAddChainId(blockchain: Blockchain): Promise<void> {
    const chain = toChainObject(blockchain);

    return ethereum().request({
      method: 'wallet_addEthereumChain',
      params: [chain],
    });
  }

  async function requestBalance(account: string): Promise<string | undefined> {
    return web3.eth.getBalance(account);
  }

  async function sign(address: string, message: string): Promise<string> {
    return web3.eth.personal.sign(message, address, '');
  }

  async function addContract(asset: Asset, svgData: string, currentBlockchain?: Blockchain): Promise<boolean> {
    if (asset.blockchain !== currentBlockchain) {
      await requestChangeToBlockchain(asset.blockchain);
      return false;
    }
    const tokenContract = createContract(asset.chainId);

    const symbol = await tokenContract.methods.symbol().call();
    const decimals = await tokenContract.methods.decimals().call();

    return ethereum().request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: asset.chainId,
          symbol,
          decimals,
          image: `data:image/svg+xml;base64,${Buffer.from(svgData).toString('base64')}`,
        },
      },
      id: Math.round(Math.random() * 10000),
    });
  }

  function verifyAccount(accounts: string[]): string | undefined {
    if ((accounts?.length ?? 0) <= 0) return undefined;
    // check if address is valid
    return Web3.utils.toChecksumAddress(accounts[0]);
  }

  function toUsableNumber(balance: any, decimals = 18): BigNumber {
    return new BigNumber(balance).dividedBy(Math.pow(10, decimals));
  }

  async function readBalance(asset: Asset, address?: string): Promise<AssetBalance> {
    if (!address || !asset) return { asset, amount: 0 };

    if (asset.type === AssetType.COIN) {
      return web3.eth.getBalance(address).then((balance) => ({ asset, amount: toUsableNumber(balance).toNumber() }));
    }

    try {
      const tokenContract = createContract(asset.chainId);
      const decimals = await tokenContract.methods.decimals().call();
      return await tokenContract.methods
        .balanceOf(address)
        .call()
        .then((balance: any) => ({ asset, amount: toUsableNumber(balance, decimals) }));
    } catch {
      return { asset, amount: 0 };
    }
  }

  async function createTransaction(amount: BigNumber, asset: Asset, from: string, to: string): Promise<string> {
    if (asset.type === AssetType.COIN) {
      const transactionData = { from, to, value: web3.utils.toWei(amount.toString(), 'ether') };
      return web3.eth.sendTransaction(transactionData).then((value) => value.transactionHash);
    } else {
      const tokenContract = createContract(asset.chainId);
      const decimals = await tokenContract.methods.decimals().call();
      const adjustedAmount = amount.multipliedBy(Math.pow(10, decimals)).toFixed();
      return tokenContract.methods
        .transfer(to, adjustedAmount)
        .send({ from })
        .then((value: any) => value.transactionHash);
    }
  }

  function createContract(chainId?: string): Contract {
    return new web3.eth.Contract(ERC20_ABI as any, chainId);
  }

  async function timeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout));

    return Promise.race([promise, timeoutPromise]);
  }

  return {
    isInstalled,
    getWalletType,
    register,
    getAccount,
    requestAccount,
    requestBlockchain,
    requestChangeToBlockchain,
    requestBalance,
    sign,
    addContract,
    readBalance,
    createTransaction,
  };
}
