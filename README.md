# DFX Services

Reusable web widget to buy, sell and convert crypto assets

## Usage

DFX Services can be used as a standalone page or integrated into any webpage using an Iframe.

### Opening

Just open [services.dfx.swiss](https://services.dfx.swiss/) with the authentication information of the user (see [below](#authentication)). If the services are used as a standalone page, a redirect URI has to be provided (see [query parameters](#query-parameters)).

#### Authentication

The services can be opened either with address and signature (not recommended) or a JWT access token for DFX API. Details on the authentication can be found in the [API documentation](https://github.com/DFXswiss/api#registration).

- Address/signature parameters
  - `address`: blockchain address of the user (required)
  - `signature`: signature of the DFX API sign message (required)
  - `wallet`: wallet/client identifier (name or ID), used for sign up, see [API documentation](https://github.com/DFXswiss/api#initial-wallet-setup-optional) (optional)
- Token parameters
  - `session`: access token for the DFX API (required)

#### Entry Points

There are multiple entry points (URL paths) for the services, depending on what the user should do.

- Home (`/`): the user can select the action himself (buy, sell, convert)
- Buy (`/buy`): the user is directly forwarded to the buy crypto page
- Sell (`/sell`): the user is directly forwarded to the sell crypto page
- Convert (`/convert`): _TBD_

#### Query Parameters

There are parameters to preselect all or a part of the required information.

- Redirect URI (`redirect-uri`): URI to redirect the user to after cancel or completion (see [closing](#closing))
- Blockchain (`blockchain`): filter for the asset selection (useful if the user has a multi-chain address)
- Balances (`balances`): wallet balances of the user (required for sell and convert), usage example: `balances=0.35@113,12.3@111`
- Input amount (`amount-in`): the amount to sell or convert (in input asset)
- Output amount (`amount-out`): the amount to receive (in output asset) (_TBD_)
- Input asset: (`asset-in`): the asset to sell or convert (crypto asset or currency)
- Output asset (`asset-out`): the asset to receive (crypto asset or currency)
- Bank account (`bank-account`): the bank account to send the money to (for sell)

Hints:

- To select an asset, either the name of the asset (e.g. `BTC`, caution when using multi-chain accounts - not recommended), the unique name (e.g. `Ethereum/ETH`) or the DFX asset ID (get from [asset endpoint](https://api.dfx.swiss/swagger#/Asset/AssetController_getAllAsset)) can be used.
- To select a currency, either the name (e.g. `USD`) or the DFX fiat ID (get from [fiat endpoint](https://api.dfx.swiss/swagger#/Fiat/FiatController_getAllFiat)) can be used.
- To select a bank account, either an IBAN, the account id or the account label (get from [bank accounts endpoint](https://api.dfx.swiss/swagger#/BankAccount/BankAccountController_getAllUserBankAccount)) can be used.

### Closing

There are multiple types of closings.

- Cancel: user cancelled the service
- Buy: user wants to buy crypto
- Sell: user wants to sell crypto
- Convert: user wants to convert crypto

If the user wants to sell or convert, the caller has to initiate the corresponding transaction, as the widget does not have the right to issue a transaction. The required information is provided on closing (see below);

#### Standalone

On cancel or completion, the user will be redirected to the `redirect-uri`. Depending on the type of closing, a suffix will be appended to the URI and parameters will be provided.

- Cancel: redirected to `{redirect-url}`
- Buy: redirected to `{redirect-url}buy`
- Sell: redirected to `{redirect-url}sell` with the following parameters:
  - `routeId`: Sell route ID (get details from [route endpoint](https://api.dfx.swiss/swagger#/Sell/SellController_getSell), authentication required)
  - `amount`: Amount to sell
- Convert: _TBD_

#### Iframe

On cancel or completion, a message will be sent on the window object of the browser. The following data format is used.

```ts
enum CloseType {
  CANCEL = 'cancel',
  BUY = 'buy',
  SELL = 'sell',
  CONVERT = 'convert',
}

interface CloseMessage {
  type: CloseType;
  buy?: BuyPaymentInfoDto;
  sell?: SellPaymentInfoDto;
}
```

Example code:

```html
<script>
  window.addEventListener('message', (event: MessageEvent<string>) => handleClose(event.data));

  function handleClose(data: string) {
    try {
      const message: CloseMessage = JSON.parse(data);
      /* ADD YOUR CODE HERE */
    } catch (e) {
      console.error('Failed to handle Iframe message:', e);
    }
  }
</script>

<iframe src="https://services.dfx.swiss" height="600" width="500" frameborder="0" />
```

Documentation on `BuyPaymentInfoDto` and `SellPaymentInfoDto` can be found in the [DFX API Swagger documentation](https://api.dfx.swiss/).
