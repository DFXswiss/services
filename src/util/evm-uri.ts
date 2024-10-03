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
    const ethUriPattern = /^ethereum:([a-zA-Z0-9]+)@(\d+)(\/[a-zA-Z0-9]+)?(\?.*)?$/;
    const match = ethUriPattern.exec(uri);

    if (!match) return undefined;

    const [, address, chainId, query] = match;

    const params: EvmUriData & Record<string, any> = {
      scheme: 'ethereum',
      address: address.toLowerCase(),
      chainId: parseInt(chainId, 10),
    };

    if (query) {
      const queryParams = new URLSearchParams(query);

      if (queryParams.has('value')) {
        params.amount = queryParams.get('value') ?? undefined;
      }

      if (queryParams.has('contractAddress')) {
        params.tokenContractAddress = queryParams.get('contractAddress')?.toLowerCase();
      }
    }

    return params;
  }
}
