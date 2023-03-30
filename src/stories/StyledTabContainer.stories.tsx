import { ComponentStory, ComponentMeta } from '@storybook/react';
import { IconVariant } from './DfxIcon';
import StyledTabContainer from './StyledTabContainer';

export default {
  title: 'Composites/StyledTabContainer',
  component: StyledTabContainer,
} as ComponentMeta<typeof StyledTabContainer>;

export const Default: ComponentStory<typeof StyledTabContainer> = (args) => {
  return <StyledTabContainer {...args} />;
};

Default.args = {
  activeTab: 0,
  tabs: [
    {
      title: 'Buy',
      icon: IconVariant.BANK,
      deactivated: false,
      content: (
        <>
          <h2>Tab 1: Buy</h2>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt praesentium explicabo, quibusdam nisi quae
            a! Quis consectetur qui, impedit autem exercitationem incidunt eligendi. Itaque quaerat dolor non velit,
            maiores perspiciatis?
          </p>
        </>
      ),
    },
    {
      title: 'Sell',
      icon: IconVariant.WALLET,
      deactivated: false,
      content: (
        <>
          <h2>Tab 2: Sell</h2>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt praesentium explicabo, quibusdam nisi quae
            a! Quis consectetur qui, impedit autem exercitationem incidunt eligendi. Itaque quaerat dolor non velit,
            maiores perspiciatis?
          </p>
        </>
      ),
    },
    {
      title: 'Convert',
      deactivated: false,
      flagWord1: 'Coming',
      flagWord2: 'soon',
      content: (
        <>
          <h2>Tab 3: Convert</h2>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt praesentium explicabo, quibusdam nisi quae
            a! Quis consectetur qui, impedit autem exercitationem incidunt eligendi. Itaque quaerat dolor non velit,
            maiores perspiciatis?
          </p>
        </>
      ),
    },
    { title: 'Stake', deactivated: true, flagWord1: 'Beta', content: 'null' },
  ],
};
