import '@dfx.swiss/react';

declare module '@dfx.swiss/react' {
  interface Fees {
    bankFixed?: number;
    bankPercent?: number;
  }
}
