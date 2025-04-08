import { Asset, AssetType, Blockchain } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer';
import { useMemo } from 'react';
import Web3 from 'web3';
import { TransactionConfig } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import ERC20_ABI from '../../static/erc20.abi.json';
import { AbortError } from '../../util/abort-error';
import { TranslatedError } from '../../util/translated-error';
import { timeout } from '../../util/utils';
import { useWeb3 } from '../web3.hook';

export enum WalletType {
  RABBY = 'Rabby',
  META_MASK = 'MetaMask',
  META_MASK_BROWSER = 'MetaMaskBrowser',
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
  sign: (address: string, message: string) => Promise<string>;
  addContract: (asset: Asset, svgData: string, currentBlockchain?: Blockchain) => Promise<boolean>;
  createTransaction: (
    amount: BigNumber,
    asset: Asset,
    from: string,
    to: string,
    config?: { isWeiAmount?: boolean; gasPrice?: number },
  ) => Promise<string>;
}

interface MetaMaskError {
  code: number;
  message: string;
}

export function useMetaMask(): MetaMaskInterface {
  const web3 = new Web3(Web3.givenProvider);
  const { toBlockchain, toChainHex, toChainObject } = useWeb3();

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
      if (eth.isMetaMask)
        return window.navigator.userAgent.includes('MetaMask') ? WalletType.META_MASK_BROWSER : WalletType.META_MASK;
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

    try {
      const accounts = await web3.eth.requestAccounts();
      return verifyAccount(accounts);
    } catch (e) {
      handleError(e as MetaMaskError);
    }
  }

  async function requestBlockchain(): Promise<Blockchain | undefined> {
    return toBlockchain(await web3.eth.getChainId());
  }

  async function requestChangeToBlockchain(blockchain?: Blockchain): Promise<void> {
    if (!blockchain) return;

    const chainId = toChainHex(blockchain);
    if (!chainId) return;

    return ethereum()
      .request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
      .catch((e: MetaMaskError) => {
        // 4902 chain is not yet added to MetaMask, therefore add chainId to MetaMask
        if (e && e.code === 4902) {
          return requestAddChainId(blockchain);
        }

        handleError(e);
      });
  }

  async function requestAddChainId(blockchain: Blockchain): Promise<void> {
    const chain = toChainObject(blockchain);

    return ethereum().request({
      method: 'wallet_addEthereumChain',
      params: [chain],
    });
  }

  async function sign(address: string, message: string): Promise<string> {
    return web3.eth.personal.sign(message, address, '').catch(handleError);
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

  async function createTransaction(
    amount: BigNumber,
    asset: Asset,
    from: string,
    to: string,
    config?: { isWeiAmount?: boolean; gasPrice?: number },
  ): Promise<string> {
    if (asset.type === AssetType.COIN) {
      const transactionData: TransactionConfig = {
        from,
        to,
        value: config?.isWeiAmount ? amount.toString() : web3.utils.toWei(amount.toString(), 'ether'),
        maxPriorityFeePerGas: null as any,
        maxFeePerGas: null as any,
        gasPrice: config?.gasPrice,
      };

      return web3.eth.sendTransaction(transactionData).then((value) => value.transactionHash);
    } else {
      const tokenContract = createContract(asset.chainId);

      let adjustedAmount = amount.toString();
      if (!config?.isWeiAmount) {
        const decimals = await tokenContract.methods.decimals().call();
        adjustedAmount = amount.multipliedBy(Math.pow(10, decimals)).toFixed();
      }

      return tokenContract.methods
        .transfer(to, adjustedAmount)
        .send({ from, maxPriorityFeePerGas: null, maxFeePerGas: null, gasPrice: config?.gasPrice })
        .then((value: any) => value.transactionHash);
    }
  }

  function createContract(chainId?: string): Contract {
    return new web3.eth.Contract(ERC20_ABI as any, chainId);
  }

  function handleError(e: MetaMaskError): never {
    switch (e.code) {
      case 4001:
        throw new AbortError('User cancelled');

      case -32002:
        throw new TranslatedError('There is already a request pending. Please confirm it in your MetaMask and retry.');
    }

    throw e;
  }

  return useMemo(
    () => ({
      isInstalled,
      getWalletType,
      register,
      getAccount,
      requestAccount,
      requestBlockchain,
      requestChangeToBlockchain,
      sign,
      addContract,
      createTransaction,
    }),
    [],
  );
}
