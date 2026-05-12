import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './modal';

const SampleFullscreenContent = () => (
  <div className="flex flex-col gap-4 text-dfxBlue-800">
    <h1 className="text-2xl font-semibold">Fullscreen modal</h1>
    <p className="text-sm">
      The fullscreen variant fills the viewport below the layout header. It is used for primary content flows such as
      KYC, Safe Deposit, and Buy / Sell.
    </p>
    <div className="rounded-md bg-dfxGray-300 p-4 text-sm">
      Body content area — fills the available viewport width up to <code>max-w-screen-md</code>.
    </div>
    <button className="self-start rounded-md bg-dfxRed-100 px-4 py-2 text-sm font-semibold text-white">Continue</button>
  </div>
);

const SampleDialogContent = () => (
  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto w-full">
    <h2 className="text-lg font-semibold text-dfxBlue-800 mb-3 text-left">Confirm action</h2>
    <p className="text-sm text-dfxBlue-800 mb-6 text-left">
      The dialog variant is used for confirmations and short compliance flows. The card sits centered on a translucent
      backdrop.
    </p>
    <div className="flex justify-end gap-2">
      <button className="rounded-md border border-dfxGray-500 px-4 py-2 text-sm text-dfxBlue-800">Cancel</button>
      <button className="rounded-md bg-dfxRed-100 px-4 py-2 text-sm font-semibold text-white">Confirm</button>
    </div>
  </div>
);

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    docs: {
      description: {
        component:
          'Shared Modal component with two visually distinct variants. The variant controls layout — never the content. ' +
          'Visual regressions on either variant indicate either an unintended default flip or a layout drift in the ' +
          'variant branch itself; both are blocking issues in PR review.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Modal>;

/**
 * Regression guard: renders the Modal without passing a `variant` prop.
 * If the component's default ever drifts away from `fullscreen` (as happened
 * in PR #1048 / fixed in #1090), this story's snapshot changes.
 */
export const Default: Story = {
  args: {
    isOpen: true,
  },
  render: (args) => (
    <Modal {...args}>
      <SampleFullscreenContent />
    </Modal>
  ),
};

export const Fullscreen: Story = {
  args: {
    isOpen: true,
    variant: 'fullscreen',
  },
  render: (args) => (
    <Modal {...args}>
      <SampleFullscreenContent />
    </Modal>
  ),
};

export const Dialog: Story = {
  args: {
    isOpen: true,
    variant: 'dialog',
  },
  render: (args) => (
    <Modal {...args}>
      <SampleDialogContent />
    </Modal>
  ),
};
