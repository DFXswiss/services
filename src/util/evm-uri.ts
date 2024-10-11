type EvmUriData = {
  address?: string;
  chainId?: string;
  amount?: string;
  tokenContractAddress?: string;
  method?: string;
};

export class EvmUri {
  static decode(uri: string): EvmUriData | null {
    const basePattern = /^ethereum:([^@]+)@([^/?]+)(?:\/([^?]+))?/;
    const match = basePattern.exec(uri);

    if (!match) return null;

    const [, addressOrToken, chainId, method] = match;
    const queryParams = new URLSearchParams(uri.split('?')[1]);

    return method
      ? {
          tokenContractAddress: addressOrToken,
          chainId,
          method,
          address: queryParams.get('address') || undefined,
          amount: queryParams.get('uint256') || undefined,
        }
      : {
          address: addressOrToken,
          chainId,
          amount: queryParams.get('value') || undefined,
        };
  }
}
