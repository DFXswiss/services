import createWebComponent from '@r2wc/react-to-web-component';
import { WidgetParams } from './App';
import MainWidget from './Main.widget';
import './index.css';

const props: { [k in keyof WidgetParams]: 'string' | 'number' | 'boolean' | 'function' | 'json' } = {
  flags: 'string',
  lang: 'string',
  address: 'string',
  signature: 'string',
  mail: 'string',
  wallet: 'string',
  refcode: 'string',
  session: 'string',
  redirectUri: 'string',
  mode: 'string',
  blockchain: 'string',
  balances: 'string',
  amountIn: 'string',
  amountOut: 'string',
  assets: 'string',
  assetIn: 'string',
  assetOut: 'string',
  paymentMethod: 'string',
  bankAccount: 'string',
  onClose: 'function',
  service: 'string',
};

const DfxServices = createWebComponent(MainWidget, { shadow: 'closed', props });

customElements.define('dfx-services', DfxServices);
