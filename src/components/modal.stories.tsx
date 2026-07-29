import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './modal';

function SampleFullscreenContent(): JSX.Element {
  return (
    <div className="flex flex-col gap-6 text-dfxBlue-800">
      <header className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-dfxGray-800">Step 2 of 4</span>
        <h1 className="text-2xl font-semibold">Identity verification</h1>
        <p className="text-sm text-dfxGray-800">
          Confirm the information on your government-issued ID. All fields are required.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">First name</span>
          <input
            type="text"
            defaultValue="Jane"
            readOnly
            className="rounded-md border border-dfxGray-500 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Last name</span>
          <input
            type="text"
            defaultValue="Müller"
            readOnly
            className="rounded-md border border-dfxGray-500 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Date of birth</span>
          <input
            type="text"
            defaultValue="1985-04-12"
            readOnly
            className="rounded-md border border-dfxGray-500 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <p className="rounded-md bg-dfxGray-300 p-3 text-xs text-dfxGray-800">
        We share these details with our regulated KYC partner. Your data is never sold and is deleted on request.
      </p>

      <div className="flex flex-row gap-2 self-start">
        <button
          type="button"
          className="rounded-md border border-dfxGray-500 px-4 py-2 text-sm font-medium text-dfxBlue-800"
        >
          Cancel
        </button>
        <button type="button" className="rounded-md bg-dfxRed-100 px-4 py-2 text-sm font-semibold text-white">
          Continue
        </button>
      </div>
    </div>
  );
}

function SampleDialogContent(): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto w-full text-dfxBlue-800">
      <h2 className="text-lg font-semibold mb-3 text-left">Refund transaction</h2>
      <p className="text-sm mb-4 text-left">
        This will return the full amount to the sender via SEPA. The transaction cannot be undone.
      </p>
      <dl className="grid grid-cols-2 gap-y-1 text-sm mb-6 rounded-md bg-dfxGray-300 p-3">
        <dt className="text-dfxGray-800">Amount</dt>
        <dd className="text-right font-medium">CHF 1,250.00</dd>
        <dt className="text-dfxGray-800">Recipient IBAN</dt>
        <dd className="text-right font-mono text-xs">CH00 0000 0000 0000 0000 0</dd>
        <dt className="text-dfxGray-800">Reference</dt>
        <dd className="text-right text-xs">TX-2026-04-1893</dd>
      </dl>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-dfxGray-500 px-4 py-2 text-sm font-medium text-dfxBlue-800"
        >
          Cancel
        </button>
        <button type="button" className="rounded-md bg-dfxRed-100 px-4 py-2 text-sm font-semibold text-white">
          Confirm refund
        </button>
      </div>
    </div>
  );
}

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
