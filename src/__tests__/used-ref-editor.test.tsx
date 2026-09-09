// Component tests for UsedRefEditor: what the box shows for an account with and without a referral
// code, which values reach the hook, and what the clerk sees when the API refuses or the clerk has
// no verified name.

const mockStaffName: { name?: string; isLoading: boolean; error?: string } = { name: 'JR', isLoading: false };
const mockUpdateUsedRef = jest.fn();

jest.mock('src/hooks/used-ref.hook', () => ({
  USED_REF_PATTERN: /^\w{1,3}-\w{1,3}$/,
  useUsedRef: () => ({ updateUsedRef: mockUpdateUsedRef }),
}));

jest.mock('src/hooks/staff-verified-name.hook', () => ({
  useStaffVerifiedName: () => mockStaffName,
}));

jest.mock('src/components/error-hint', () => ({
  ErrorHint: ({ message }: { message: string }) => <p data-testid="error-hint">{message}</p>,
}));

// The helper module pulls in @dfx.swiss/react (ESM this Jest setup cannot parse); the one value the
// util reads is the sentinel the backend stores for "no referrer".
jest.mock('src/util/compliance-helpers', () => ({ DEFAULT_REF: '000-000' }));
jest.mock('@dfx.swiss/react', () => ({ UserRole: {} }));

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NavigateFunction } from 'react-router-dom';
import { UsedRefEditor } from 'src/components/compliance/used-ref-editor';
import type { UserInfo } from 'src/hooks/compliance.hook';

const mockNavigate = jest.fn();
const navigate = mockNavigate as unknown as NavigateFunction;

function wallet(overrides: Partial<UserInfo> = {}): UserInfo {
  return {
    id: 422258,
    address: '0x6ce9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d52142',
    ref: '311-224',
    usedRef: '000-000',
    role: 'User',
    status: 'Active',
    walletName: 'DFX',
    created: '2026-07-31T14:44:00.000Z',
    ...overrides,
  };
}

const referred = wallet({ usedRef: '172-134', refUserName: 'Samuel Kullmann', refUserDataId: 328304 });

function editor(users: UserInfo[], props: Partial<{ canEdit: boolean; onSaved: jest.Mock; userDataId: string }> = {}) {
  return (
    <UsedRefEditor
      userDataId={props.userDataId ?? '408808'}
      users={users}
      canEdit={props.canEdit ?? true}
      navigate={navigate}
      onSaved={props.onSaved ?? jest.fn()}
    />
  );
}

function renderEditor(users: UserInfo[], props: Partial<{ canEdit: boolean; onSaved: jest.Mock }> = {}) {
  return render(editor(users, props));
}

function openForm(label: 'Set' | 'Change'): void {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

function fill(code: string, reason: string): void {
  fireEvent.change(screen.getByLabelText('Ref-Code'), { target: { value: code } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: reason } });
}

describe('UsedRefEditor', () => {
  beforeEach(() => {
    mockUpdateUsedRef.mockReset();
    mockNavigate.mockReset();
    mockStaffName.name = 'JR';
    mockStaffName.isLoading = false;
    mockStaffName.error = undefined;
  });

  it('shows one line for an account without ref code, whatever its number of wallets, and offers to set one', () => {
    renderEditor([wallet({ id: 1 }), wallet({ id: 2, address: '0xdef' }), wallet({ id: 3, address: '0x123' })]);

    expect(screen.getAllByText('No Ref-Code')).toHaveLength(1);
    expect(screen.queryByText(/wallets/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set' })).toBeInTheDocument();
  });

  it('shows the referrer once in the known form, links to their account and offers to change the code', () => {
    renderEditor([referred, { ...referred, id: 2, address: '0xdef' }]);

    const buttons = screen.getAllByRole('button', { name: 'Samuel Kullmann #328304 (172-134)' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/compliance/user/328304');
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });

  it('shows a code whose owner is unknown without a link', () => {
    renderEditor([wallet({ usedRef: '555-555' })]);

    const button = screen.getByRole('button', { name: '- (555-555)' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('lists every code with its wallet count when the wallets of the account differ', () => {
    renderEditor([referred, wallet({ id: 2, address: '0xdef' }), wallet({ id: 3, address: '0x123' })]);

    expect(screen.getByRole('button', { name: 'Samuel Kullmann #328304 (172-134)' })).toBeInTheDocument();
    expect(screen.getByText('1 wallet')).toBeInTheDocument();
    expect(screen.getByText('No Ref-Code')).toBeInTheDocument();
    expect(screen.getByText('2 wallets')).toBeInTheDocument();

    openForm('Change');
    expect(screen.getByLabelText('Ref-Code')).toHaveValue('172-134');
    expect(screen.getByText('The code is set on all 3 wallets of the account.')).toBeInTheDocument();
  });

  it('starts with an empty code when the wallets carry two different codes', () => {
    renderEditor([referred, wallet({ id: 2, address: '0xdef', usedRef: '555-555' })]);

    openForm('Change');
    expect(screen.getByLabelText('Ref-Code')).toHaveValue('');
  });

  it('shows the box read-only for a session that may not change the code', () => {
    renderEditor([referred], { canEdit: false });

    expect(screen.getByRole('button', { name: 'Samuel Kullmann #328304 (172-134)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
  });

  it('prefills the current code when changing, saves code and reason and reports the change', async () => {
    const onSaved = jest.fn();
    const updated = [wallet({ usedRef: '194-687' })];
    mockUpdateUsedRef.mockResolvedValue(updated);
    renderEditor([wallet({ usedRef: '123-456' })], { onSaved });

    openForm('Change');
    expect(screen.getByLabelText('Ref-Code')).toHaveValue('123-456');
    expect(screen.getByText('JR')).toBeInTheDocument();

    fill(' 194-687 ', '  Referral confirmed by mail  ');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
    expect(mockUpdateUsedRef).toHaveBeenCalledWith('408808', {
      usedRef: '194-687',
      reason: 'Referral confirmed by mail',
    });
    expect(screen.queryByLabelText('Ref-Code')).not.toBeInTheDocument();
  });

  it('starts with an empty code when none is set and disables Save until code and reason are valid', () => {
    renderEditor([wallet()]);

    openForm('Set');
    expect(screen.getByLabelText('Ref-Code')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fill('194687', 'reason');
    expect(screen.getByText('Enter the Ref-Code in the format 123-456.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fill('194-687', '   ');
    expect(screen.queryByText('Enter the Ref-Code in the format 123-456.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fill('194-687', 'reason');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('starts one update for two clicks in the same tick and locks Save while it runs', async () => {
    let finish: (value: UserInfo[]) => void = () => undefined;
    mockUpdateUsedRef.mockImplementation(() => new Promise<UserInfo[]>((resolve) => (finish = resolve)));
    const onSaved = jest.fn();
    renderEditor([wallet()], { onSaved });

    openForm('Set');
    fill('194-687', 'reason');
    const save = screen.getByRole('button', { name: 'Save' });
    // One act: React batches the state updates, so the button is still enabled for the second click.
    act(() => {
      fireEvent.click(save);
      fireEvent.click(save);
    });

    expect(mockUpdateUsedRef).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    finish([wallet({ usedRef: '194-687' })]);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('ignores an update that finishes after the box is gone', async () => {
    let finish: (value: UserInfo[]) => void = () => undefined;
    let fail: (reason: Error) => void = () => undefined;
    mockUpdateUsedRef.mockImplementation(
      () =>
        new Promise<UserInfo[]>((resolve, reject) => {
          finish = resolve;
          fail = reject;
        }),
    );
    const onSaved = jest.fn();
    const { unmount } = renderEditor([wallet()], { onSaved });

    openForm('Set');
    fill('194-687', 'reason');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    unmount();

    finish([wallet({ usedRef: '194-687' })]);
    await Promise.resolve();
    expect(onSaved).not.toHaveBeenCalled();

    // The rejection path after unmount must be just as silent.
    const { unmount: unmountSecond } = renderEditor([wallet()], { onSaved });
    openForm('Set');
    fill('194-687', 'reason');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    unmountSecond();
    fail(new Error('late'));
    await Promise.resolve();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('closes the form on account switch, resets the save lock, and drops a late success for the previous account', async () => {
    let finish: (value: UserInfo[]) => void = () => undefined;
    mockUpdateUsedRef.mockImplementation(() => new Promise<UserInfo[]>((resolve) => (finish = resolve)));
    const onSaved = jest.fn();
    const { rerender } = renderEditor([wallet()], { onSaved });

    openForm('Set');
    fill('194-687', 'reason');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockUpdateUsedRef).toHaveBeenCalledWith('408808', { usedRef: '194-687', reason: 'reason' });

    rerender(editor([wallet({ id: 9, address: '0x999' })], { onSaved, userDataId: '204824' }));
    expect(screen.queryByLabelText('Ref-Code')).not.toBeInTheDocument();

    openForm('Set');
    fill('194-687', 'reason');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    finish([wallet({ usedRef: '194-687' })]);
    await Promise.resolve();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Ref-Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('does not show a late error from the previous account after the form is open on the new one', async () => {
    let fail: (reason: Error) => void = () => undefined;
    mockUpdateUsedRef.mockImplementation(() => new Promise<UserInfo[]>((_resolve, reject) => (fail = reject)));
    const onSaved = jest.fn();
    const { rerender } = renderEditor([wallet()], { onSaved });

    openForm('Set');
    fill('194-687', 'reason');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    rerender(editor([wallet({ id: 9, address: '0x999' })], { onSaved, userDataId: '204824' }));
    openForm('Set');

    fail(new Error('Referral code not found'));
    await Promise.resolve();
    expect(screen.queryByText('Referral code not found')).not.toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows the API message when the code is refused and keeps the form open', async () => {
    mockUpdateUsedRef.mockRejectedValue(new Error('Referral code not found'));
    renderEditor([wallet()]);

    openForm('Set');
    fill('999-999', 'typo');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Referral code not found')).toBeInTheDocument();
    expect(screen.getByLabelText('Ref-Code')).toHaveValue('999-999');
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    mockUpdateUsedRef.mockRejectedValue('boom');
    renderEditor([wallet()]);

    openForm('Set');
    fill('999-999', 'typo');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Failed to save the Ref-Code')).toBeInTheDocument();
  });

  it('closes the form on Cancel and drops a pending error', async () => {
    mockUpdateUsedRef.mockRejectedValue(new Error('Referral code not found'));
    renderEditor([wallet()]);

    openForm('Set');
    fill('999-999', 'typo');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Referral code not found');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Ref-Code')).not.toBeInTheDocument();
    openForm('Set');
    expect(screen.queryByText('Referral code not found')).not.toBeInTheDocument();
  });

  it('refuses to save without a verified clerk name and says why', () => {
    mockStaffName.name = undefined;
    renderEditor([wallet()]);

    openForm('Set');
    fill('194-687', 'reason');

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByTestId('error-hint')).toHaveTextContent(
      'Staff identification requires a verified name on this account.',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('names the load error when the clerk name could not be fetched', () => {
    mockStaffName.name = undefined;
    mockStaffName.error = 'network';
    renderEditor([wallet()]);

    openForm('Set');

    expect(screen.getByTestId('error-hint')).toHaveTextContent('Could not load your verified name: network');
  });

  it('waits while the clerk name is loading', () => {
    mockStaffName.name = undefined;
    mockStaffName.isLoading = true;
    renderEditor([wallet()]);

    openForm('Set');
    fill('194-687', 'reason');

    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.queryByTestId('error-hint')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
