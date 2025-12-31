import { Api } from '../config/api';
import { Lnurl } from './lnurl';
import { url } from './utils';

export class OpenCryptoPayUtils {
  static getOcpUrlByUniqueId(uniqueId: string): string {
    const apiUrl = url({
      base: `${Api.url}/${Api.version}`,
      path: `lnurlp/${uniqueId}`,
    });

    return Lnurl.prependLnurl(Lnurl.encode(apiUrl));
  }
}
