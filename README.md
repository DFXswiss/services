# DFX Services

Reusable web widget to buy, sell and swap crypto assets

![ ](https://content.dfx.swiss/img/v1/services/iframe.png)

## Usage

DFX Services can be integrated in three different ways,

- as a [standalone page](#standalone) (with browser redirect)
- in an [Iframe](#iframe) (not recommended)
- using a [web component](#web-component)
- as a [React component](#react-component) (NPM package)

and supports two different login modes,

- [direct login](#direct-login) (session is provided directly on opening)
- [wallet login](#wallet-login) (the user connects a wallet to DFX services).

**Content**

- [Integration](#integration-types)
- [Authentication](#authentication-modes)
- [Parameters](#query-parameters)
- [Closing](#closing)
- [Code examples](#code-examples)

### Integration Types

#### Standalone

DFX services can be integrated using a browser redirect to [services.dfx.swiss](https://services.dfx.swiss/) with the desired parameters (see [below](#query-parameters)). For standalone usage, the `redirect-uri` parameter should be provided. On cancel or completion, the user will be redirected to this URI (see [redirect](#redirect)).

#### Iframe

DFX services can be integrated by opening [services.dfx.swiss](https://services.dfx.swiss/) with the desired parameters (see [below](#query-parameters)) in an Iframe. See the [code example](#iframe-example) below.

On cancel or completion, a message will be sent on the window object of the browser. See [below](#close-message) for details on the message format. If a redirect URI is specified, the user will be redirected to this URI (see [redirect](#redirect)).

#### Web Component

DFX services can be integrated as a web component. See the [code example](#web-component-example) below. The desired parameters (see [below](#query-parameters)) can be supplied as attributes.

For web component integration, a closing callback (`on-close` attribute) should be provided. On cancel or completion, this callback is called. See [below](#close-message) for details on the message format.

#### React Component

DFX services can be integrated as React component from the [`@dfx.swiss/services-react` NPM package](https://www.npmjs.com/package/@dfx.swiss/services-react). See code example [below](#react-component-example). The desired parameters (see [below](#query-parameters)) can be supplied as props.

Similar to the Web Component, the React component requires a closing callback (`onClose` prop) to be provided. On cancel or completion, this callback is called. See [below](#close-message) for details on the message format.

### Authentication Modes

#### Direct Login

Credentials can be provided directly when opening DFX services. This is recommended for integrators with access to the wallet of the user. The services can be opened with a JWT access token for DFX API. Details on the authentication can be found in the [API documentation](https://github.com/DFXswiss/api#registration). Use the following parameter.

- `session`: access token for the DFX API

When using direct login, the type of service (`buy`, `sell` or `swap`) should be preselected. For standalone or Iframe integration, the service type needs to be added as URL path (e.g. `services.dfx.swiss/buy`). For web/react component integration the `service` attribute can be used.

For selling or swapping, the integrator should provide the available asset balances (see `balances` [parameter](#query-parameters)). Additionally, the integrator finally has to initiate the corresponding blockchain transaction, as the widget does not have the right to do so (see [closing](#closing) and [integration](#integration-types) chapters for more details).

#### Wallet Login

If no credentials are provided during opening, the user will be presented with a guided tour. He will be asked to connect a wallet of his choice, which will be used to log in to DFX. The following wallets are currently supported (depending on the crypto asset the user selects).

- Mobile apps
  - [DFX BTC Taro Wallet](https://dfx.swiss/app/btc)
  - All apps compatible with [WalletConnect](https://walletconnect.com/explorer?type=wallet)
- Browser extensions
  - [MetaMask](https://metamask.io/)
  - [Rabby](https://rabby.io/)
  - [Alby](https://getalby.com/)
- Hardware wallets
  - [BitBox](https://bitbox.swiss/)
  - [Ledger](https://www.ledger.com/)
  - [Trezor](https://trezor.io/)
- CLI (custom login with address and signature)

### Query Parameters

DFX services supports the following parameters. Note that for the React component, the parameters are written in _camelCase_, e.g. `assetIn` instead of `asset-in` (see [React component example](#react-component-example)).

**General parameters**

- Settings

  - Language (`lang`): app language (`en`, `de`, `fr`, `it`)

- User information

  - E-mail (`mail`): user email
  - Wallet (`wallet`): wallet/client identifier (name or ID), used for sign up, see [API documentation](https://github.com/DFXswiss/api#initial-wallet-setup-optional) (optional, but recommended)
  - Referral code (`refcode`): sign-up referral code
  - Special code (`special-code`): special/promo code

- Transaction information

  - Payment method (`payment-method`): the payment method (buy only, `bank`, `instant` or `card`)
  - Bank account (`bank-account`): the bank account to send the money to (sell only)
  - Input amount (`amount-in`): the amount to sell or swap (in input asset)
  - Output amount (`amount-out`): the amount to receive (in output asset) (_TBD_)
  - Assets: (`assets`): crypto asset filter
  - Input asset: (`asset-in`): the asset to sell or swap (crypto asset or currency)
  - Output asset (`asset-out`): the asset to receive (crypto asset or currency)
  - External transaction ID (`external-transaction-id`): a custom ID to track the transaction

_Hint: Asset selection parameters may be overwritten when using [wallet login](#wallet-login)_

**Direct login parameters**

- Access token (`session`): access token for the DFX API
- Balances (`balances`): wallet balances of the user (recommended for sell and swap), usage example: `balances=0.35@113,12.3@111`
- Blockchain (`blockchain`): filter for the asset selection (useful if the user has a multi-chain address)
- Blockchains (`blockchains`): supported blockchains to which the user can switch

**Special parameters**

- Redirect URI (`redirect-uri`): URI to redirect the user to after cancel or completion (only for [standalone](#standalone) or [Iframe](#iframe) integration, see [closing](#closing))
- Headless (`headless=true`): hides the menu bar
- Borderless (`borderless=true`): removes the page padding

#### Hints

- To select an asset, either the name of the asset (e.g. `BTC`, caution when using multi-chain accounts - not recommended), the unique name (e.g. `Ethereum/ETH`) or the DFX asset ID (get from [asset endpoint](https://api.dfx.swiss/swagger#/Asset/AssetController_getAllAsset)) can be used.
- To select a currency, either the name (e.g. `USD`) or the DFX fiat ID (get from [fiat endpoint](https://api.dfx.swiss/swagger#/Fiat/FiatController_getAllFiat)) can be used.
- To select a bank account, either an IBAN, the account id or the account label (get from [bank accounts endpoint](https://api.dfx.swiss/swagger#/BankAccount/BankAccountController_getAllUserBankAccount)) can be used.

### Closing

There are multiple types of closings.

- Cancel: user cancelled the service
- Buy: user wants to buy crypto
- Sell: user wants to sell crypto
- Swap: user wants to swap crypto

In case of a sell or swap, the service returns the information (`isComplete`) as to whether the required blockchain transaction has already been executed or not. If `isComplete` is set to `false`, the integrator should initiate the corresponding transaction to complete the sell/swap.

#### Redirect

If a redirect URI was provided (`redirect-uri` parameter), the user will be redirected to this URI on cancel or completion. Depending on the type of closing, a suffix will be appended to the URI and parameters will be provided.

- Cancel: redirected to `{redirect-url}`
- Buy: redirected to `{redirect-url}/buy`
- Sell/swap: redirected to `{redirect-url}/sell` or `{redirect-url}/swap` with the following parameters:

  - `routeId`: sell/swap route ID (get details from [sell route](https://api.dfx.swiss/swagger#/Sell/SellController_getSell) or [swap route](https://api.dfx.swiss/swagger#/Swap/SwapController_getSwap) endpoint, authentication required)
  - `amount`: amount to send
  - `asset`: asset to send
  - `blockchain`: transfer blockchain
  - `isComplete`: is `true`, if blockchain transaction is already executed

#### Close Message

The following data format is used for the close message ([Iframe](#iframe), [web component](#web-component) or [React component](#react-component) integration).

```ts
enum CloseType {
  CANCEL = 'cancel',
  BUY = 'buy',
  SELL = 'sell',
  SWAP = 'swap',
  PAYMENT = 'payment',
}

interface CloseMessage {
  type: CloseType;
  isComplete?: boolean; // is 'true', if transaction is already executed
  buy?: BuyPaymentInfoDto;
  sell?: SellPaymentInfoDto;
  swap?: SwapPaymentInfoDto;
}
```

Documentation on `BuyPaymentInfoDto`, `SellPaymentInfoDto` and `SwapPaymentInfoDto` can be found in the [DFX API Swagger documentation](https://api.dfx.swiss/).

### Code Examples

#### Iframe Example

```html
<script>
  window.addEventListener('message', (event: MessageEvent<CloseMessage>) => handleClose(event.data));

  function handleClose(message: CloseMessage) {
    try {
      /* ADD YOUR CODE HERE */
    } catch (e) {
      console.error('Failed to handle Iframe message:', e);
    }
  }
</script>

<iframe src="https://services.dfx.swiss" height="600" width="450" frameborder="0" />
```

#### Web Component Example

```html
<script defer="defer" src="https://services.dfx.swiss/widget/v1.0"></script>
<script>
  function handleClose(data: CloseMessage) {
    /* ADD YOUR CODE HERE */
  }
</script>

<h1>DFX Services in a Widget</h1>

<dfx-services on-close="handleClose" session="{ACCESS_TOKEN}">Loading ...</dfx-services>
```

#### React Component Example

```tsx
import { DfxServices, Service, CloseMessage } from '@dfx.swiss/services-react';

function App() {
  const handleClose = (data: CloseMessage) => {
    /* ADD YOUR CODE HERE */
  };

  return <DfxServices headless="true" service={Service.BUY} session="{ACCESS_TOKEN}" onClose={handleClose} />;
}
```
