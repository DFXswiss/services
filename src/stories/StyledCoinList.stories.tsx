import StyledCoinListItem from './StyledCoinListItem';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import StyledCoinList from './StyledCoinList';
import { Protocol } from '../hooks/blockchain.hook';
import { Asset } from '../api/definitions/asset';

const dummyAssets = {
  eth: { name: 'ETH', description: 'Ethereum', comingSoon: false },
  usdt: { name: 'USDT', description: 'Tether', comingSoon: false },
  usdc: { name: 'USDC', description: 'USD Coin', comingSoon: false },
  dfi: { name: 'DFI', description: 'DFI', comingSoon: false },
  bnb: { name: 'BNB', description: 'BNB', comingSoon: false },
  busd: { name: 'BUSD', description: 'Binance USD', comingSoon: false },
};

export default {
  title: 'Composites/CoinListing',
  component: StyledCoinList,
} as ComponentMeta<typeof StyledCoinList>;

export const CoinListingRow: ComponentStory<typeof StyledCoinList> = (args) => {
  return (
    <div className="bg-white p-10">
      <StyledCoinList {...args}>
        <StyledCoinListItem
          asset={dummyAssets.eth as Asset}
          onClick={() => {
            console.log('clicked');
          }}
          protocol={Protocol.ERC_20}
        />
        <StyledCoinListItem
          asset={dummyAssets.usdt as Asset}
          onClick={() => {
            console.log('clicked');
          }}
          protocol={Protocol.ERC_20}
        />
        <StyledCoinListItem
          asset={dummyAssets.usdc as Asset}
          onClick={() => {
            console.log('clicked');
          }}
          protocol={Protocol.ERC_20}
        />
        <StyledCoinListItem
          asset={dummyAssets.busd as Asset}
          onClick={() => {
            console.log('clicked');
          }}
          protocol={Protocol.ERC_20}
        />{' '}
        <StyledCoinListItem
          asset={dummyAssets.usdt as Asset}
          onClick={() => {
            console.log('clicked');
          }}
          protocol={Protocol.ERC_20}
        />
        <StyledCoinListItem
          asset={dummyAssets.usdc as Asset}
          onClick={() => {
            console.log('clicked');
          }}
          protocol={Protocol.ERC_20}
        />
      </StyledCoinList>
    </div>
  );
};
CoinListingRow.args = {
  heading: 'Ethereum mainnet · ERC-20 token',
};
