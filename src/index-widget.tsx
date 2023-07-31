import createWebComponent from '@r2wc/react-to-web-component';
import { AppParams } from './App';
import MainWidget from './Main.widget';
import './index.css';

const propNames: (keyof AppParams)[] = [
  'address',
  'signature',
  'wallet',
  'session',
  'redirectUri',
  'blockchain',
  'balances',
  'amountIn',
  'amountOut',
  'assetIn',
  'assetOut',
  'bankAccount',
];

const DfxServices = createWebComponent(MainWidget, { shadow: 'closed', props: propNames });

customElements.define('dfx-services', DfxServices);
