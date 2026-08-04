// Direct test: ConfirmDialog blocks Escape/backdrop while isLoading is true.

const mockRootRef: { current: HTMLElement | null } = { current: null };

jest.mock('@dfx.swiss/react-components', () => ({
  StyledButton: ({ label, onClick, disabled, isLoading }: any) => (
    <button type="button" onClick={onClick} disabled={disabled || isLoading}>
      {label}
    </button>
  ),
  StyledButtonWidth: { FULL: 'full' },
  StyledButtonColor: { STURDY_WHITE: 'white', BLUE: 'blue', RED: 'red' },
}));

jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_key: string, value: string) => value,
  }),
}));

jest.mock('src/contexts/layout.context', () => ({
  useLayoutContext: () => ({
    rootRef: mockRootRef,
    modalRootRef: { current: null },
  }),
}));

import { fireEvent, render } from '@testing-library/react';
import { ConfirmDialog } from 'src/components/confirm-dialog';

const mockOnCancel = jest.fn();

beforeEach(() => {
  mockRootRef.current = document.body;
  jest.clearAllMocks();
});

describe('ConfirmDialog loading close handling', () => {
  it('ignores escape while a request is running', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test title"
        message="Test message"
        isLoading={true}
        onConfirm={jest.fn()}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('ignores a backdrop click while a request is running', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test title"
        message="Test message"
        isLoading={true}
        onConfirm={jest.fn()}
        onCancel={mockOnCancel}
      />,
    );

    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(backdrop);

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('closes on escape and backdrop click when idle', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test title"
        message="Test message"
        onConfirm={jest.fn()}
        onCancel={mockOnCancel}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(backdrop);

    expect(mockOnCancel).toHaveBeenCalledTimes(2);
  });
});
