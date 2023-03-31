import * as IbanTools from 'ibantools';

type KeyType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export class Utils {
  static groupBy<T, U>(list: T[], key: KeyType<T, U>): Map<U, T[]> {
    return list.reduce(
      (map, item) => map.set(item[key] as U, (map.get(item[key] as U) ?? []).concat(item)),
      new Map<U, T[]>(),
    );
  }

  static createRules(rules: any): any {
    for (const property in rules) {
      if (rules[property] instanceof Array) {
        rules[property] = rules[property].reduce((prev: any, curr: any) => Utils.updateObject(prev, curr), {});
      }
    }
    return rules;
  }

  private static updateObject(obj?: any, update?: any): unknown {
    return obj ? { ...obj, ...update } : undefined;
  }

  static formatAmount(amount?: number): string {
    return amount?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') ?? '';
  }

  static formatAmountCrypto(num: number): string {
    let r = (+num.toPrecision(6)).toFixed(6);
    if (r.match(/\./)) {
      r = r.replace(/\.?0+$/, '');
    }
    return r;
  }

  static formatIban(iban?: string): string | null {
    return IbanTools.friendlyFormatIBAN(iban);
  }

  static isJwt(jwt?: string): boolean {
    return jwt ? /^[A-Za-z0-9_-]{2,}(?:\.[A-Za-z0-9_-]{2,}){2}$/.test(jwt) : false;
  }
}
