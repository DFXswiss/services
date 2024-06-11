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
  wallet: 'string',
  wallets: 'string',
  refcode: 'string',
  specialCode: 'string',
  session: 'string',
  redirectUri: 'string',
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
};

const DfxServices = createWebComponent(MainWidget, { shadow: 'closed', props });

customElements.define('dfx-services', DfxServices);
