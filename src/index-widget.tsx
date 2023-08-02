import createWebComponent from '@r2wc/react-to-web-component';
import { WidgetParams } from './App';
import MainWidget from './Main.widget';
import './index.css';

const props: { [k in keyof WidgetParams]: 'string' | 'number' | 'boolean' | 'function' | 'json' } = {
  address: 'string',
  signature: 'string',
  wallet: 'string',
  session: 'string',
  redirectUri: 'string',
  blockchain: 'string',
  balances: 'string',
  amountIn: 'string',
  amountOut: 'string',
  assetIn: 'string',
  assetOut: 'string',
  bankAccount: 'string',
  onClose: 'function',
  service: 'string',
};

const DfxServices = createWebComponent(MainWidget, { shadow: 'closed', props });

customElements.define('dfx-services', DfxServices);
