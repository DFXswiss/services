import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { Blockchain } from '../api/definitions/blockchain';
import { useBlockchain } from '../hooks/blockchain.hook';
import { useMetaMask } from '../hooks/metamask.hook';
import { Utils } from '../utils';

interface WalletInterface {
  address?: string;
  blockchain?: Blockchain;
  balance?: string;
  isInstalled: boolean;
  isConnected: boolean;
  connect: () => Promise<string>;
  signMessage: (message: string, address: string) => Promise<string>;
}

const WalletContext = createContext<WalletInterface>(undefined as any);

export function useWalletContext(): WalletInterface {
  return useContext(WalletContext);
}

export function WalletContextProvider(props: PropsWithChildren): JSX.Element {
  const [address, setAddress] = useState<string>();
  const [blockchain, setBlockchain] = useState<Blockchain>();
  const [balance, setBalance] = useState<string>();
  const { isInstalled, register, requestAccount, requestBlockchain, requestBalance, sign } = useMetaMask();
  const { toMainToken } = useBlockchain();

  const isConnected = address !== undefined;

  useEffect(() => {
    register(setAddress, setBlockchain);
  }, []);

  useEffect(() => {
    if (address) {
      requestBalance(address).then((balance) => {
        if (balance && blockchain) {
          setBalance(`${Utils.formatAmountCrypto(+balance)} ${toMainToken(blockchain)}`);
        } else {
          setBalance(undefined);
        }
      });
    } else {
      setBalance(undefined);
    }
  }, [address, blockchain]);

  async function connect(): Promise<string> {
    const account = await requestAccount();
    if (!account) throw new Error('Permission denied or account not verified');
    setAddress(account);
    setBlockchain(await requestBlockchain());
    return account;
  }

  async function signMessage(message: string, address: string): Promise<string> {
    try {
      return await sign(address, message);
    } catch (e: any) {
      // TODO (Krysh): real error handling
      // {code: 4001, message: 'User rejected the request.'} = requests accounts cancel
      // {code: 4001, message: 'MetaMask Message Signature: User denied message signature.'} = login signature cancel
      console.error(e.message, e.code);
      throw e;
    }
  }

  const context: WalletInterface = {
    address,
    balance,
    blockchain,
    isInstalled,
    isConnected,
    connect,
    signMessage,
  };

  return <WalletContext.Provider value={context}>{props.children}</WalletContext.Provider>;
}
