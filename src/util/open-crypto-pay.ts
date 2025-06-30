import { Lnurl } from './lnurl';
import { url } from './utils';

export class OpenCryptoPayUtils {
  static getOcpUrlByUniqueId(uniqueId: string): string {
    const apiUrl = url({
      base: `${process.env.REACT_APP_API_URL}/${process.env.REACT_APP_API_VERSION}`,
      path: `lnurlp/${uniqueId}`,
    });

    return Lnurl.prependLnurl(Lnurl.encode(apiUrl));
  }
}
