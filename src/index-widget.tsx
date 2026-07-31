import createWebComponent from '@r2wc/react-to-web-component';
import { WidgetParams } from './App';
import MainWidget from './Main.widget';
import './index.css';
import { installChunkErrorHandling } from './util/client-error';
import { preserveStringAttribute } from './util/web-component';

// The widget build swaps this file in for index.tsx, so the handling wired up there never reaches
// this bundle. Embedded on third-party pages, it is also where a chunk left stale by a deploy has
// the longest to sit in a cache.
installChunkErrorHandling();

const props: { [k in keyof WidgetParams]: 'string' | 'number' | 'boolean' | 'function' | 'json' } = {
  headless: 'string',
  borderless: 'string',
  hideTargetSelection: 'string',
  flags: 'string',
  lang: 'string',
  address: 'string',
  signature: 'string',
  pubkey: 'string',
  mail: 'string',
  accountType: 'string',
  firstName: 'string',
  lastName: 'string',
  street: 'string',
  houseNumber: 'string',
  zip: 'string',
  city: 'string',
  country: 'string',
  organizationName: 'string',
  organizationStreet: 'string',
  organizationHouseNumber: 'string',
  organizationZip: 'string',
  organizationCity: 'string',
  organizationCountry: 'string',
  phone: 'string',
  wallet: 'string',
  wallets: 'string',
  refcode: 'string',
  specialCode: 'string',
  recommendationCode: 'string',
  session: 'string',
  redirectUri: 'string',
  autoStart: 'string',
  mode: 'string',
  blockchain: 'string',
  blockchains: 'string',
  balances: 'string',
  amountIn: 'string',
  amountOut: 'string',
  assets: 'string',
  assetIn: 'string',
  assetOut: 'string',
  paymentMethod: 'string',
  bankAccount: 'string',
  externalTransactionId: 'string',
  personalIban: 'string',
  onClose: 'function',
  service: 'string',
};

const BaseDfxServices = createWebComponent(MainWidget, { shadow: 'closed', props });
const DfxServices = preserveStringAttribute(
  BaseDfxServices,
  'personal-iban',
  'personalIban',
);

customElements.define('dfx-services', DfxServices);
