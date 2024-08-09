import { bech32 } from 'bech32';
import { Buffer } from 'buffer';

export class Lnurl {
  static encode(string: string): string {
    const words = bech32.toWords(Buffer.from(string));
    return bech32.encode('LNURL', words, 1023).toUpperCase();
  }

  static decode(lnurl: string): string | undefined {
    const decoded = bech32.decode(lnurl, 1023);
    try {
      return Buffer.from(bech32.fromWords(decoded.words)).toString('utf8');
    } catch (e) {
      return undefined;
    }
  }

  static prependLnurl(lnurl: string): string {
    const baseDomain = `${window.location.protocol}//${window.location.host}`;
    return `${baseDomain}/payment-link/?lightning=${lnurl}`;
  }

  static addressToLnurl(address: string): string {
    const [user, domain] = address.split('@');
    const wellKnownUrl = `https://${domain}/.well-known/lnurlp/${user}`;

    return this.encode(wellKnownUrl);
  }
}
