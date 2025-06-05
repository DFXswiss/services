import { Asset } from '@dfx.swiss/react';
import * as SolanaToken from '@solana/spl-token';
import * as Solana from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { BigNumberish, formatUnits, parseUnits } from 'ethers';
import { useMemo } from 'react';
import { AssetBalance } from 'src/contexts/balance.context';

export interface SolanaInterface {
  getAddressBalances: (assets: Asset[], address: string) => Promise<AssetBalance[]>;
  createCoinTransaction(fromAddress: string, toAddress: string, amount: BigNumber): Promise<Solana.Transaction>;
  createTokenTransaction(
    fromAddress: string,
    toAddress: string,
    token: Asset,
    amount: BigNumber,
  ): Promise<Solana.Transaction>;
}

export function useSolana(): SolanaInterface {
  async function getAddressBalances(assets: Asset[], address: string): Promise<AssetBalance[]> {
    const balances: AssetBalance[] = [];

    /*
    const url = `${process.env.REACT_APP_TATUM_URL}/${process.env.REACT_APP_TATUM_KEY ?? ''}`;
    const connection = new Solana.Connection(url);

    const solanaAssets = assets.filter((a) => Blockchain.SOLANA === a.blockchain);

    const nativeAsset = solanaAssets.find((a) => a.type === AssetType.COIN);
    const tokenAssets = solanaAssets.filter((a) => a.type === AssetType.TOKEN);

    if (nativeAsset) {
      balances.push(await getCoinBalance(connection, address, nativeAsset));
    }

    if (tokenAssets.length > 0) {
      balances.push(...(await getTokenBalances(connection, address, tokenAssets)));
    }
      */

    return balances;
  }

  async function getCoinBalance(connection: Solana.Connection, address: string, asset: Asset): Promise<AssetBalance> {
    const rawBalance = await connection.getBalance(new Solana.PublicKey(address), 'confirmed');
    const amount = fromLamportAmount(rawBalance);
    return { asset, amount };
  }

  async function getTokenBalances(
    connection: Solana.Connection,
    address: string,
    assets: Asset[],
  ): Promise<AssetBalance[]> {
    const tokenBalances: AssetBalance[] = [];

    for (const asset of assets) {
      if (!asset.chainId) continue;

      const mint = new Solana.PublicKey(asset.chainId);

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new Solana.PublicKey(address),
        { mint },
        'confirmed',
      );

      let amount = 0;

      for (const tokenAccount of tokenAccounts.value) {
        const info = tokenAccount.account.data.parsed.info;
        const tokenAmount = info.tokenAmount;

        amount += fromLamportAmount(tokenAmount.amount, tokenAmount.decimals);
      }

      tokenBalances.push({ asset: asset, amount });
    }

    return tokenBalances;
  }

  async function createCoinTransaction(
    fromAddress: string,
    toAddress: string,
    amount: BigNumber,
  ): Promise<Solana.Transaction> {
    const url = `${process.env.REACT_APP_TATUM_URL}/${process.env.REACT_APP_TATUM_KEY ?? ''}`;
    const connection = new Solana.Connection(url);

    const fromPublicKey = new Solana.PublicKey(fromAddress);
    const toPublicKey = new Solana.PublicKey(toAddress);
    const lamports = toLamportAmount(amount);

    const transaction = new Solana.Transaction().add(
      Solana.SystemProgram.transfer({ fromPubkey: fromPublicKey, toPubkey: toPublicKey, lamports }),
    );

    transaction.feePayer = fromPublicKey;

    const latestBlockHash = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = latestBlockHash.blockhash;

    return transaction;
  }

  async function createTokenTransaction(
    fromAddress: string,
    toAddress: string,
    token: Asset,
    amount: BigNumber,
  ): Promise<Solana.Transaction> {
    const url = `${process.env.REACT_APP_TATUM_URL}/${process.env.REACT_APP_TATUM_KEY ?? ''}`;
    const connection = new Solana.Connection(url);

    const mintAddress = token.chainId;
    if (!mintAddress) throw new Error(`No mint address for token ${token.uniqueName} found`);
    const decimals = token.decimals;
    if (!decimals) throw new Error(`No decimals for token ${token.uniqueName} found`);

    const fromPublicKey = new Solana.PublicKey(fromAddress);
    const toPublicKey = new Solana.PublicKey(toAddress);

    const mintPublicKey = new Solana.PublicKey(mintAddress);

    const fromTokenAccount = await SolanaToken.getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
    const toTokenAccount = await SolanaToken.getAssociatedTokenAddress(mintPublicKey, toPublicKey);

    const accountsResponse = await connection.getTokenAccountsByOwner(toPublicKey, {
      mint: new Solana.PublicKey(mintAddress),
    });
    const isTokenAccountAvailable = accountsResponse.value.length > 0;

    const transaction = new Solana.Transaction();

    if (!isTokenAccountAvailable) {
      transaction.add(
        SolanaToken.createAssociatedTokenAccountInstruction(fromPublicKey, toTokenAccount, toPublicKey, mintPublicKey),
      );
    }

    transaction.add(
      SolanaToken.createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPublicKey,
        toLamportAmount(amount, decimals),
        [],
        SolanaToken.TOKEN_PROGRAM_ID,
      ),
    );

    transaction.feePayer = fromPublicKey;

    const latestBlockHash = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = latestBlockHash.blockhash;

    return transaction;
  }

  return useMemo(() => ({ getAddressBalances, createCoinTransaction, createTokenTransaction }), []);
}

function fromLamportAmount(amountLamportLike: BigNumberish, decimals?: number): number {
  const useDecimals = getDecimals(decimals);
  return Number(formatUnits(amountLamportLike, getDecimals(useDecimals)));
}

function toLamportAmount(amountSolLike: BigNumber, decimals?: number): number {
  const useDecimals = getDecimals(decimals);
  const amount = new BigNumber(amountSolLike).toFixed(getDecimals(useDecimals));
  return Number(parseUnits(amount, useDecimals));
}

function getDecimals(decimals?: number): number {
  return decimals ?? new BigNumber(1 / Solana.LAMPORTS_PER_SOL).decimalPlaces() ?? 9;
}
