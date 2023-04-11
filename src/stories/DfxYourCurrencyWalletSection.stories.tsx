import { ComponentMeta, ComponentStory } from '@storybook/react';
import { Asset } from '../api/definitions/asset';
import { Blockchain } from '../api/definitions/blockchain';
import { Fiat } from '../api/definitions/fiat';
import { Protocol } from '../hooks/blockchain.hook';
import DfxYourCurrencyWalletSection from './DfxYourCurrencyWalletSection';

export default {
  title: 'Composites/DfxYourCurrencyWalletSection',
  component: DfxYourCurrencyWalletSection,
} as ComponentMeta<typeof DfxYourCurrencyWalletSection>;

const dummyCurrencies: Fiat[] = [
  { id: 1, name: 'EUR', buyable: true, sellable: true },
  { id: 2, name: 'USD', buyable: true, sellable: true },
];

const dummyAsset: Asset = {
  id: 1001,
  name: 'ETH',
  description: 'Ethereum',
  buyable: false,
  sellable: false,
  blockchain: Blockchain.ETH,
  comingSoon: false,
};

export const Default: ComponentStory<typeof DfxYourCurrencyWalletSection> = () => {
  return (
    <div className="bg-white p-10 max-w-2xl">
      <DfxYourCurrencyWalletSection
        currencies={dummyCurrencies}
        currencyElementName="currency"
        asset={dummyAsset}
        assetProtocol={Protocol.ERC_20}
        onAssetClick={() => console.log('clicked on asset')}
      />
    </div>
  );
};
Default.args = {};
