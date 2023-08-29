declare module 'bitbox02-api' {
  export function getDevicePath(): Promise<string>;
  export function getKeypathFromString(keyPath: string): number[];

  export const constants: {
    Product: { BitBox02Multi: string; BitBox02BTCOnly: string; BitBoxBaseStandard: string };
    Status: {
      Connected: string;
      Unpaired: string;
      PairingFailed: string;
      Uninitialized: string;
      Seeded: string;
      Initialized: string;
      RequireFirmwareUpgrade: string;
      RequireAppUpgrade: string;
    };
    Event: {
      ChannelHashChanged: string;
      StatusChanged: string;
      AttestationCheckDone: string;
    };
    messages: {
      ETHCoin: { ETH: number; RopstenETH: number; RinkebyETH: number };
      ETHPubRequest_OutputType: { ADDRESS: number; XPUB: number };
      BTCCoin: { BTC: number; TBTC: number; LTC: number; TLTC: number };
      BTCScriptConfig_SimpleType: { P2WPKH_P2SH: number; P2WPKH: number; P2TR: number };
      BTCOutputType: { UNKNOWN: number; P2PKH: number; P2SH: number; P2WPKH: number; P2WSH: number; P2TR: number };
      BTCXPubType: {
        TPUB: number;
        XPUB: number;
        YPUB: number;
        ZPUB: number;
        VPUB: number;
        UPUB: number;
        CAPITAL_VPUB: number;
        CAPITAL_ZPUB: number;
        CAPITAL_UPUB: number;
        CAPITAL_YPUB: number;
      };
      CardanoNetwork: { CardanoMainnet: number; CardanoTestnet: number };
    };
  };

  export class BitBox02API {
    constructor(devicePath: string);

    connect(
      showPairingCb: (pairingCode: string) => void,
      userVerify: () => Promise<void>,
      handleAttestationCb: (attestationResult: boolean) => void,
      onCloseCb: () => void,
      setStatusCb: (status: BitboxStatus) => void,
    ): Promise<void>;
    connectionValid(): boolean;
    close();

    btcDisplayAddressSimple(coin: number, keyPath: number[], xPubType: number, display?: boolean): Promise<string>;
    btcSignMessage(
      coin: number,
      type: number,
      keyPath: number[],
      message: Buffer,
    ): Promise<{ signature: Uint8Array; recID: number; electrumSignature: Uint8Array }>;

    ethDisplayAddress(keyPath: string, display?: boolean): Promise<string>;
    ethSignMessage(args: {
      keypath: string;
      message: Buffer;
    }): Promise<{ r: Uint8Array; s: Uint8Array; v: Uint8Array }>;

    firmware(): {
      Product: () => string;
    };
  }
}
