import { Asset, AssetType, Blockchain } from '@dfx.swiss/react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { TrustWalletAdapter } from '@solana/wallet-adapter-trust';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink';
import { TrustAdapter } from '@tronweb3/tronwallet-adapter-trust';
import BigNumber from 'bignumber.js';
import { Buffer } from 'buffer';
import { encodeBase58 } from 'ethers';
import { useMemo } from 'react';
import { isMobile } from 'react-device-detect';
import { WalletType } from 'src/contexts/wallet.context';
import Web3 from 'web3';
import { TransactionConfig } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { AssetBalance } from '../../contexts/balance.context';
import ERC20_ABI from '../../static/erc20.abi.json';
import { AbortError } from '../../util/abort-error';
import { TranslatedError } from '../../util/translated-error';
import { timeout } from '../../util/utils';
import { useSolana } from '../solana.hook';
import { useTron } from '../tron.hook';
import { useWeb3 } from '../web3.hook';

export interface WalletInfo {
  name: string;
  type: WalletType;
  blockchain: Blockchain;
  isInstalled: boolean;
  icon?: string;
}

export interface BrowserExtensionInterface {
  isInstalled: (walletType: WalletType) => boolean;
  getWalletType: () => WalletType | undefined;

  connect: (walletType: WalletType, blockchain: Blockchain) => Promise<string>;
  getAccount: (blockchain: Blockchain) => Promise<string | undefined>;
  requestAccount: (blockchain: Blockchain) => Promise<string | undefined>;

  register?: (
    onAccountChanged: (account?: string) => void,
    onBlockchainChanged: (blockchain?: Blockchain) => void,
  ) => void;
  requestBlockchain?: () => Promise<Blockchain | undefined>;
  requestChangeToBlockchain?: (blockchain?: Blockchain) => Promise<void>;
  requestBalance?: (account: string) => Promise<string>;
  addContract?: (asset: Asset, svgData: string, currentBlockchain?: Blockchain) => Promise<boolean>;
  readBalance?: (asset: Asset, address?: string, passOnException?: boolean) => Promise<AssetBalance>;

  signMessage: (address: string, message: string, walletType: WalletType, blockchain: Blockchain) => Promise<string>;
  createTransaction: (
    amount: BigNumber,
    asset: Asset,
    from: string,
    to: string,
    walletType: WalletType,
    blockchain: Blockchain,
    config?: { isWeiAmount?: boolean; gasPrice?: number },
  ) => Promise<string>;
}

interface MetaMaskError {
  code: number;
  message: string;
}

export function useBrowserExtension(): BrowserExtensionInterface {
  const web3 = useMemo(() => new Web3(Web3.givenProvider), []);

  const { toBlockchain, toChainHex, toChainObject } = useWeb3();
  const { createCoinTransaction: createSolanaCoinTransaction, createTokenTransaction: createSolanaTokenTransaction } =
    useSolana();
  const { createCoinTransaction: createTronCoinTransaction, createTokenTransaction: createTronTokenTransaction } =
    useTron();

  // Solana connections
  const phantomWallet = useMemo(() => new PhantomWalletAdapter(), []);
  const trustSolanaWallet = useMemo(() => new TrustWalletAdapter(), []);
  const solanaConnection = useMemo(() => new Connection(clusterApiUrl('mainnet-beta')), []);

  // Tron adapters
  const tronLinkWallet = useMemo(() => new TronLinkAdapter(), []);
  const trustTronWallet = useMemo(() => new TrustAdapter(), []);

  // Helper functions
  function ethereum() {
    return (window as any).ethereum;
  }

  function phantom() {
    return (window as any).phantom;
  }

  function tronLink() {
    return (window as any).tronLink;
  }

  // Wallet Detection Functions
  function isInstalled(walletType: WalletType): boolean {
    const eth = ethereum();
    switch (walletType) {
      case WalletType.META_MASK:
        return Boolean(eth?.isMetaMask);
      case WalletType.RABBY:
        return Boolean(eth?.isRabby);
      case WalletType.SAFE_PAL:
        return Boolean(eth?.isSafePal);
      case WalletType.COINBASE:
        return Boolean(eth?.isCoinbaseWallet);
      case WalletType.TRUST:
        return Boolean(eth?.isTrustWallet);
      case WalletType.PHANTOM_SOL:
      case WalletType.TRUST_SOL:
        return Boolean(phantom());
      case WalletType.TRON_LINK_TRX:
      case WalletType.TRUST_TRX:
        return Boolean(tronLink());
      default:
        return false;
    }
  }

  function getWalletType(): WalletType {
    const eth = ethereum();
    if (eth) {
      const hasInAppWalletAgent = /MetaMask|CoinbaseWallet|Trust|Rainbow|Zerion/i.test(window.navigator.userAgent);
      const isInApp = (eth.isTrust || eth.isCoinbaseWallet) && isMobile;

      if (hasInAppWalletAgent || isInApp) return WalletType.IN_APP_BROWSER;
    }

    return WalletType.BROWSER_EXTENSION;
  }

  async function connect(walletType: WalletType, blockchain: Blockchain): Promise<string> {
    switch (blockchain) {
      case Blockchain.ETHEREUM:
      case Blockchain.ARBITRUM:
      case Blockchain.OPTIMISM:
      case Blockchain.BASE:
      case Blockchain.BINANCE_SMART_CHAIN:
      case Blockchain.POLYGON:
        return connectEthereum();
      case Blockchain.SOLANA:
        return connectSolana(walletType);
      case Blockchain.TRON:
        return connectTron(walletType);
      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }

  async function connectEthereum(): Promise<string> {
    try {
      const accounts = await web3.eth.requestAccounts();
      return verifyAccount(accounts);
    } catch (e) {
      handleError(e as MetaMaskError);
    }
  }

  async function connectSolana(walletType: WalletType): Promise<string> {
    try {
      let wallet;
      switch (walletType) {
        case WalletType.PHANTOM_SOL:
          wallet = phantomWallet;
          break;
        case WalletType.TRUST_SOL:
          console.log('Using Trust Wallet for Solana');
          wallet = trustSolanaWallet;
          break;
        default:
          throw new Error(`Unsupported Solana wallet: ${walletType}`);
      }

      await wallet.connect();

      if (wallet.publicKey) return wallet.publicKey.toBase58();
      throw new Error('No public key found');
    } catch (error) {
      handleGenericError(error);
    }
  }

  async function connectTron(walletType: WalletType): Promise<string> {
    try {
      let wallet;

      switch (walletType) {
        case WalletType.TRON_LINK_TRX:
          wallet = tronLinkWallet;
          break;
        case WalletType.TRUST_TRX:
        case WalletType.TRUST:
          wallet = trustTronWallet;
          break;
        default:
          throw new Error(`Unsupported Tron wallet: ${walletType}`);
      }

      await wallet.connect();

      if (wallet.address) return wallet.address;
      throw new Error('No address found');
    } catch (error) {
      handleGenericError(error);
    }
  }

  async function getAccount(blockchain: Blockchain): Promise<string | undefined> {
    switch (blockchain) {
      case Blockchain.ETHEREUM:
      case Blockchain.ARBITRUM:
      case Blockchain.OPTIMISM:
      case Blockchain.BASE:
      case Blockchain.BINANCE_SMART_CHAIN:
      case Blockchain.POLYGON:
        return verifyAccount(await web3.eth.getAccounts());
      default:
        return undefined;
    }
  }

  async function requestAccount(blockchain: Blockchain): Promise<string | undefined> {
    switch (blockchain) {
      case Blockchain.ETHEREUM:
      case Blockchain.ARBITRUM:
      case Blockchain.OPTIMISM:
      case Blockchain.BASE:
      case Blockchain.BINANCE_SMART_CHAIN:
      case Blockchain.POLYGON:
        await timeout(getAccount(blockchain), 1000).catch(
          (e) => e.message.includes('Timeout') && window.location.reload(),
        );
        try {
          const accounts = await web3.eth.requestAccounts();
          return verifyAccount(accounts);
        } catch (e) {
          handleError(e as MetaMaskError);
        }
        break;
      default:
        return undefined;
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

  async function requestBalance(account: string): Promise<string> {
    return web3.eth.getBalance(account);
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

  async function readBalance(asset: Asset, address?: string, throwExceptions?: boolean): Promise<AssetBalance> {
    if (!address || !asset) {
      if (throwExceptions) throw new Error('No address or asset provided');
      return { asset, amount: 0 };
    }

    try {
      if (asset.type === AssetType.COIN) {
        return web3.eth.getBalance(address).then((balance) => ({
          asset,
          amount: toUsableNumber(balance).toNumber(),
        }));
      }

      const tokenContract = createContract(asset.chainId);
      const decimals = await tokenContract.methods.decimals().call();
      return await tokenContract.methods
        .balanceOf(address)
        .call()
        .then((balance: any) => ({
          asset,
          amount: toUsableNumber(balance, decimals).toNumber(),
        }));
    } catch (e) {
      if (throwExceptions) throw e;
      return { asset, amount: 0 };
    }
  }

  // Universal Sign Message
  async function signMessage(
    address: string,
    message: string,
    walletType: WalletType,
    blockchain: Blockchain,
  ): Promise<string> {
    switch (blockchain) {
      case Blockchain.ETHEREUM:
      case Blockchain.ARBITRUM:
      case Blockchain.OPTIMISM:
      case Blockchain.BASE:
      case Blockchain.BINANCE_SMART_CHAIN:
      case Blockchain.POLYGON:
        return web3.eth.personal.sign(message, address, '').catch(handleError);

      case Blockchain.SOLANA:
        try {
          const encodedMessage = new TextEncoder().encode(message);
          let signature;

          if (walletType === WalletType.PHANTOM_SOL || walletType === WalletType.BROWSER_EXTENSION) {
            signature = await phantomWallet.signMessage(encodedMessage);
          } else if (walletType === WalletType.TRUST || walletType === WalletType.TRUST_SOL) {
            signature = await trustSolanaWallet.signMessage(encodedMessage);
          } else {
            throw new Error(`Unsupported Solana wallet: ${walletType}`);
          }

          return encodeBase58(signature);
        } catch (error) {
          handleGenericError(error);
        }
        break;

      case Blockchain.TRON:
        try {
          if (walletType === WalletType.TRON_LINK_TRX) {
            return await tronLinkWallet.signMessage(message);
          } else if (walletType === WalletType.TRUST || walletType === WalletType.TRUST_TRX) {
            return await trustTronWallet.signMessage(message);
          } else {
            throw new Error(`Unsupported Tron wallet: ${walletType}`);
          }
        } catch (error) {
          handleGenericError(error);
        }
        break;

      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }

  // Universal Create Transaction
  async function createTransaction(
    amount: BigNumber,
    asset: Asset,
    from: string,
    to: string,
    walletType: WalletType,
    blockchain: Blockchain,
    config?: { isWeiAmount?: boolean; gasPrice?: number },
  ): Promise<string> {
    switch (blockchain) {
      case Blockchain.ETHEREUM:
      case Blockchain.ARBITRUM:
      case Blockchain.OPTIMISM:
      case Blockchain.BASE:
      case Blockchain.BINANCE_SMART_CHAIN:
      case Blockchain.POLYGON:
        return createEthereumTransaction(amount, asset, from, to, config);

      case Blockchain.SOLANA:
        return createSolanaTransaction(amount, asset, from, to, walletType);

      case Blockchain.TRON:
        return createTronTransaction(amount, asset, from, to, walletType);

      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }

  async function createEthereumTransaction(
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

  async function createSolanaTransaction(
    amount: BigNumber,
    asset: Asset,
    from: string,
    to: string,
    walletType: WalletType,
  ): Promise<string> {
    try {
      const transaction =
        asset.type === AssetType.COIN
          ? await createSolanaCoinTransaction(from, to, amount)
          : await createSolanaTokenTransaction(from, to, asset, amount);

      let signedTransaction;
      if (walletType === WalletType.PHANTOM_SOL || walletType === WalletType.BROWSER_EXTENSION) {
        signedTransaction = await phantomWallet.signTransaction(transaction);
        return await phantomWallet.sendTransaction(signedTransaction, solanaConnection);
      } else if (walletType === WalletType.TRUST || walletType === WalletType.TRUST_SOL) {
        signedTransaction = await trustSolanaWallet.signTransaction(transaction);
        return await trustSolanaWallet.sendTransaction(signedTransaction, solanaConnection);
      } else {
        throw new Error(`Unsupported Solana wallet: ${walletType}`);
      }
    } catch (error) {
      handleGenericError(error);
    }
  }

  async function createTronTransaction(
    amount: BigNumber,
    asset: Asset,
    from: string,
    to: string,
    walletType: WalletType,
  ): Promise<string> {
    try {
      const unsignedTransaction =
        asset.type === AssetType.COIN
          ? await createTronCoinTransaction(from, to, amount)
          : await createTronTokenTransaction(from, to, asset, amount);

      if (walletType === WalletType.TRON_LINK_TRX) {
        const signedTransaction = await tronLinkWallet.signTransaction(unsignedTransaction);
        const tronWeb = (window as any).tronLink.tronWeb;
        return await tronWeb.trx.sendRawTransaction(signedTransaction);
      } else if (walletType === WalletType.TRUST || walletType === WalletType.TRUST_TRX) {
        const signedTransaction = await trustTronWallet.signTransaction(unsignedTransaction);
        const tronWeb = (window as any).trustwallet.tronLink.tronWeb;
        return await tronWeb.trx.sendRawTransaction(signedTransaction);
      } else {
        throw new Error(`Unsupported Tron wallet: ${walletType}`);
      }
    } catch (error) {
      handleGenericError(error);
    }
  }

  // Helper Functions
  function verifyAccount(accounts: string[]): string {
    if ((accounts?.length ?? 0) <= 0) throw new Error(`No account found}`);
    return Web3.utils.toChecksumAddress(accounts[0]);
  }

  function toUsableNumber(balance: any, decimals = 18): BigNumber {
    return new BigNumber(balance).dividedBy(Math.pow(10, decimals));
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

  function handleGenericError(error: unknown): never {
    throw new Error((error as Error).message || 'An unexpected error occurred.');
  }

  return useMemo(
    () => ({
      isInstalled,
      getWalletType,

      connect,
      getAccount,
      requestAccount,

      register,
      requestBlockchain,
      requestChangeToBlockchain,
      requestBalance,
      addContract,
      readBalance,

      signMessage,
      createTransaction,
    }),
    [web3, toBlockchain, toChainHex, toChainObject, phantomWallet, trustSolanaWallet, tronLinkWallet, trustTronWallet],
  );
}
