export interface EvmUriData {
  scheme: string;
  address: string;
  chainId: number;
  action?: string;
  amount?: string;
  tokenContractAddress?: string;
}

export class EvmUri {
  static decode(uri: string): EvmUriData | undefined {
    const ethUriPattern = /^ethereum:([a-zA-Z0-9]+)@(\d+)(\/[a-zA-Z0-9]+)?(\?.+)?$/;
    const match = ethUriPattern.exec(uri);

    if (!match) return undefined;

    const [, address, chainId, action, query] = match;

    const params: EvmUriData = {
      scheme: 'ethereum',
      address: address ? address.toLowerCase() : '',
      chainId: chainId ? parseInt(chainId, 10) : 0,
      action: action?.replace('/', ''),
    };

    if (query) {
      const queryParams = new URLSearchParams(query.substring(1));

      if (queryParams.has('uint256')) {
        params.amount = queryParams.get('uint256') ?? undefined;
      }

      if (queryParams.has('address')) {
        params.tokenContractAddress = queryParams.get('address')?.toLowerCase();
      }
    }

    return params;
  }
}
