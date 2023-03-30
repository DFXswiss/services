import StyledCoinListItem from './StyledCoinListItem';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { Protocol } from '../hooks/blockchain.hook';
import { Asset } from '../api/definitions/asset';

export default {
  title: 'Building Blocks/StyledCoinListItem',
  component: StyledCoinListItem,
} as ComponentMeta<typeof StyledCoinListItem>;

export const SingleCoinListItem: ComponentStory<typeof StyledCoinListItem> = (args) => {
  return (
    <div className="bg-white p-10">
      <StyledCoinListItem {...args}></StyledCoinListItem>
    </div>
  );
};
SingleCoinListItem.args = {
  asset: { name: 'BNB', description: 'BNB', comingSoon: false } as Asset,
  protocol: Protocol.ERC_20,
};
