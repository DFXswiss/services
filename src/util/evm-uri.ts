export interface EvmUriData {
  scheme: string;
  address: string;
  chainId: number;
  action?: string;
  value?: string;
}

export class EvmUri {
  static decode(uri: string): EvmUriData | undefined {
    const ethUriPattern = /^ethereum:([a-zA-Z0-9]+)@(\d+)(\?.*)?$/;
    const match = ethUriPattern.exec(uri);

    if (!match) return undefined;

    const [, address, chainId] = match;

    const params: EvmUriData & Record<string, any> = {
      scheme: 'ethereum',
      address: address.toLowerCase(),
      chainId: parseInt(chainId, 10),
    };

    return params;
  }
}
