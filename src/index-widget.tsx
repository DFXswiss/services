import createWebComponent from '@r2wc/react-to-web-component';
import App from './App';
import './index.css';

const DfxSwiss = createWebComponent(App);

customElements.define('dfx-swiss', DfxSwiss);
