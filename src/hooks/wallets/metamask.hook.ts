import {
  Asset,
  AssetType,
  Blockchain,
  Eip7702DelegationData,
  Eip7702SignedData,
} from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer';
import { useMemo } from 'react';
import { isMobile } from 'react-device-detect';
import Web3 from 'web3';
import { TransactionConfig } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { AssetBalance } from '../../contexts/balance.context';
import ERC20_ABI from '../../static/erc20.abi.json';
import { AbortError } from '../../util/abort-error';
import {
  TransactionFailedError,
  TransactionTimeoutError,
  waitForEvmTransactionWeb3,
} from '../../util/transaction-confirmation';
import { TranslatedError } from '../../util/translated-error';
import { timeout } from '../../util/utils';
import { useWeb3 } from '../web3.hook';

export enum WalletType {
  RABBY = 'Rabby',
  META_MASK = 'MetaMask',
  IN_APP_BROWSER = 'InAppBrowser',
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
  readBalance: (asset: Asset, address?: string, passOnException?: boolean) => Promise<AssetBalance>;
  createTransaction: (
    amount: BigNumber,
    asset: Asset,
    from: string,
    to: string,
    config?: { isWeiAmount?: boolean; gasPrice?: number },
  ) => Promise<string>;
  signEip7702Delegation: (delegationData: Eip7702DelegationData, from: string) => Promise<Eip7702SignedData>;
}

interface MetaMaskError {
  code: number;
  message: string;
}

export function useMetaMask(): MetaMaskInterface {
  const web3 = useMemo(() => new Web3(Web3.givenProvider), []);
  const { toBlockchain, toChainHex, toChainObject } = useWeb3();

  function ethereum() {
    return (window as any).ethereum;
  }

  function isInstalled(): boolean {
    const eth = ethereum();
    return Boolean(eth && (eth.isMetaMask || eth.isRabby || eth.isCoinbaseWallet || eth.isTrust));
  }

  function getWalletType(): WalletType | undefined {
    const eth = ethereum();
    if (eth) {
      const hasInAppWalletAgent = /MetaMask|CoinbaseWallet|Trust|Rainbow|Zerion/i.test(window.navigator.userAgent);
      const isInApp = (eth.isTrust || eth.isCoinbaseWallet) && isMobile;

      if (hasInAppWalletAgent || isInApp) return WalletType.IN_APP_BROWSER;

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

  async function requestBalance(account: string): Promise<string | undefined> {
    return web3.eth.getBalance(account);
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

  function toUsableNumber(balance: any, decimals = 18): BigNumber {
    return new BigNumber(balance).dividedBy(Math.pow(10, decimals));
  }

  async function readBalance(asset: Asset, address?: string, throwExceptions?: boolean): Promise<AssetBalance> {
    if (!address || !asset) {
      if (throwExceptions) throw new Error('No address or asset provided');

      return { asset, amount: 0 };
    }

    try {
      if (asset.type === AssetType.COIN) {
        return web3.eth.getBalance(address).then((balance) => ({ asset, amount: toUsableNumber(balance).toNumber() }));
      }

      const tokenContract = createContract(asset.chainId);
      const decimals = await tokenContract.methods.decimals().call();
      return await tokenContract.methods
        .balanceOf(address)
        .call()
        .then((balance: any) => ({ asset, amount: toUsableNumber(balance, decimals).toNumber() }));
    } catch (e) {
      if (throwExceptions) throw e;

      return { asset, amount: 0 };
    }
  }

  async function createTransaction(
    amount: BigNumber,
    asset: Asset,
    from: string,
    to: string,
    config?: { isWeiAmount?: boolean; gasPrice?: number },
  ): Promise<string> {
    let txHash: string;

    if (asset.type === AssetType.COIN) {
      const transactionData: TransactionConfig = {
        from,
        to,
        value: config?.isWeiAmount ? amount.toString() : web3.utils.toWei(amount.toString(), 'ether'),
        maxPriorityFeePerGas: null as any,
        maxFeePerGas: null as any,
        gasPrice: config?.gasPrice,
      };

      const result = await web3.eth.sendTransaction(transactionData);
      txHash = result.transactionHash;
    } else {
      const tokenContract = createContract(asset.chainId);

      let adjustedAmount = amount.toString();
      if (!config?.isWeiAmount) {
        const decimals = await tokenContract.methods.decimals().call();
        adjustedAmount = amount.multipliedBy(Math.pow(10, decimals)).toFixed();
      }

      const result = await tokenContract.methods
        .transfer(to, adjustedAmount)
        .send({ from, maxPriorityFeePerGas: null, maxFeePerGas: null, gasPrice: config?.gasPrice });
      txHash = result.transactionHash;
    }

    // Wait for transaction confirmation and verify it succeeded
    try {
      await waitForEvmTransactionWeb3(web3, txHash);
    } catch (error) {
      if (error instanceof TransactionFailedError) {
        throw new TranslatedError('Transaction failed on the blockchain. Please try again.');
      }
      if (error instanceof TransactionTimeoutError) {
        // Transaction was sent but confirmation timed out - return hash anyway
        // The transaction might still succeed, user can check on block explorer
        console.warn(`Transaction confirmation timed out for ${txHash}, but transaction was sent`);
      } else {
        throw error;
      }
    }

    return txHash;
  }

  function createContract(chainId?: string): Contract {
    return new web3.eth.Contract(ERC20_ABI as any, chainId);
  }

  async function signEip7702Delegation(
    delegationData: Eip7702DelegationData,
    from: string,
  ): Promise<Eip7702SignedData> {
    try {
      // Step 1: Sign the delegation using EIP-712
      const delegationSignature = await ethereum().request({
        method: 'eth_signTypedData_v4',
        params: [
          from,
          JSON.stringify({
            domain: delegationData.domain,
            types: delegationData.types,
            primaryType: 'Delegation',
            message: delegationData.message,
          }),
        ],
      });

      // Step 2: Create EIP-7702 authorization signature
      // The authorization allows the EOA to delegate its code to the delegation manager
      const authorizationTypes = {
        Authorization: [
          { name: 'chainId', type: 'uint256' },
          { name: 'address', type: 'address' },
          { name: 'nonce', type: 'uint256' },
        ],
      };

      const authorizationMessage = {
        chainId: delegationData.domain.chainId,
        address: delegationData.delegationManagerAddress,
        nonce: 0,
      };

      // Sign the EIP-7702 authorization using EIP-712
      const authSignature: string = await ethereum().request({
        method: 'eth_signTypedData_v4',
        params: [
          from,
          JSON.stringify({
            domain: {
              name: 'EIP-7702',
              version: '1',
              chainId: delegationData.domain.chainId,
            },
            types: authorizationTypes,
            primaryType: 'Authorization',
            message: authorizationMessage,
          }),
        ],
      });

      // Parse the signature into r, s, yParity (v)
      const sig = authSignature.slice(2); // Remove 0x prefix
      const r = '0x' + sig.slice(0, 64);
      const s = '0x' + sig.slice(64, 128);
      const v = parseInt(sig.slice(128, 130), 16);
      const yParity = v >= 27 ? v - 27 : v; // Normalize v to yParity (0 or 1)

      return {
        delegation: {
          delegate: delegationData.message.delegate,
          delegator: delegationData.message.delegator,
          authority: delegationData.message.authority,
          salt: delegationData.message.salt,
          signature: delegationSignature,
        },
        authorization: {
          chainId: authorizationMessage.chainId,
          address: authorizationMessage.address,
          nonce: authorizationMessage.nonce,
          r,
          s,
          yParity,
        },
      };
    } catch (e) {
      return handleError(e as MetaMaskError);
    }
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
      requestBalance,
      sign,
      addContract,
      readBalance,
      createTransaction,
      signEip7702Delegation,
    }),
    [web3, toBlockchain, toChainHex, toChainObject],
  );
}
