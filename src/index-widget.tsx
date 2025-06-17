import createWebComponent from '@r2wc/react-to-web-component';
import { WidgetParams } from './App';
import MainWidget from './Main.widget';
import './index.css';

const props: { [k in keyof WidgetParams]: 'string' | 'number' | 'boolean' | 'function' | 'json' } = {
  headless: 'string',
  borderless: 'string',
  hideTargetSelection: 'string',
  flags: 'string',
  lang: 'string',
  address: 'string',
  signature: 'string',
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
  onClose: 'function',
  service: 'string',
  lightning: 'string',
  route: 'string',
  key: 'string',
};

const DfxServices = createWebComponent(MainWidget, { shadow: 'closed', props });

customElements.define('dfx-services', DfxServices);
