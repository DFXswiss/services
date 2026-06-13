import { fireEvent, render, screen, within } from '@testing-library/react';
import { AccountsTable } from 'src/components/ledger/accounts-table';
import { LedgerAccountBalanceDto } from 'src/dto/ledger.dto';

// Identity translate: returns the default value verbatim so assertions read like the UI.
const translate = (_key: string, defaultValue: string): string => defaultValue;

function account(overrides: Partial<LedgerAccountBalanceDto>): LedgerAccountBalanceDto {
  return {
    accountId: 1,
    name: 'Account',
    type: 'Asset',
    currency: 'CHF',
    balanceNative: 0,
    balanceChf: 0,
    ...overrides,
  };
}

describe('AccountsTable', () => {
  it('renders the column headers', () => {
    render(<AccountsTable accounts={[]} translate={translate} />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Balance (CHF)')).toBeInTheDocument();
    expect(screen.getByText('Reconciliation')).toBeInTheDocument();
  });

  it('renders an empty body when there are no accounts (no type groups)', () => {
    render(<AccountsTable accounts={[]} translate={translate} />);
    // No data rows: querying for a group label that only appears with data must fail.
    expect(screen.queryByText('Subtotal')).not.toBeInTheDocument();
  });

  it('groups accounts by type in ACCOUNT_TYPE_ORDER (Asset before Liability)', () => {
    render(
      <AccountsTable
        accounts={[
          account({ accountId: 2, name: 'Customer Deposits', type: 'Liability', balanceChf: -500 }),
          account({ accountId: 1, name: 'Bank CHF', type: 'Asset', balanceChf: 1000 }),
        ]}
        translate={translate}
      />,
    );
    const rows = screen.getAllByRole('row').map((r) => r.textContent ?? '');
    const assetGroupIndex = rows.findIndex((t) => t.includes('Asset'));
    const liabilityGroupIndex = rows.findIndex((t) => t.includes('Liability'));
    expect(assetGroupIndex).toBeGreaterThanOrEqual(0);
    expect(liabilityGroupIndex).toBeGreaterThan(assetGroupIndex);
  });

  it('sorts rows within a group alphabetically by name', () => {
    render(
      <AccountsTable
        accounts={[
          account({ accountId: 1, name: 'Zebra', type: 'Asset', balanceChf: 1 }),
          account({ accountId: 2, name: 'Alpha', type: 'Asset', balanceChf: 2 }),
        ]}
        translate={translate}
      />,
    );
    const body = screen.getByText('Alpha').closest('table') as HTMLElement;
    const text = body.textContent ?? '';
    expect(text.indexOf('Alpha')).toBeLessThan(text.indexOf('Zebra'));
  });

  it('formats native and CHF balances and renders the currency', () => {
    render(
      <AccountsTable
        accounts={[account({ accountId: 1, name: 'Bank CHF', type: 'Asset', currency: 'CHF', balanceNative: 1234.5, balanceChf: 1234.5 })]}
        translate={translate}
      />,
    );
    // de-CH 2-decimal formatting for a fiat balance.
    expect(screen.getAllByText(/1.234\.50/).length).toBeGreaterThan(0);
    expect(screen.getByText('CHF')).toBeInTheDocument();
  });

  it('computes the per-group subtotal as the signed sum of balanceChf', () => {
    render(
      <AccountsTable
        accounts={[
          account({ accountId: 1, name: 'A', type: 'Asset', balanceChf: 1000 }),
          account({ accountId: 2, name: 'B', type: 'Asset', balanceChf: 500 }),
        ]}
        translate={translate}
      />,
    );
    // 1000 + 500 = 1'500.00 — a wrong sign or omitted row would change this number.
    expect(screen.getByText(/^1.500\.00$/)).toBeInTheDocument();
  });

  it('calls onSelect with the accountId when a data row is clicked', () => {
    const onSelect = jest.fn();
    render(
      <AccountsTable
        accounts={[account({ accountId: 42, name: 'Bank CHF', type: 'Asset', balanceChf: 1 })]}
        onSelect={onSelect}
        translate={translate}
      />,
    );
    fireEvent.click(screen.getByText('Bank CHF'));
    expect(onSelect).toHaveBeenCalledWith(42);
  });

  it('does not throw and adds no click handler when onSelect is omitted', () => {
    render(
      <AccountsTable
        accounts={[account({ accountId: 7, name: 'Bank CHF', type: 'Asset', balanceChf: 1 })]}
        translate={translate}
      />,
    );
    // Clicking a row with no onSelect must be a no-op (no throw).
    expect(() => fireEvent.click(screen.getByText('Bank CHF'))).not.toThrow();
  });

  it('renders a reconciliation dot whose color reflects the row recon status', () => {
    const { container } = render(
      <AccountsTable
        accounts={[
          account({ accountId: 1, name: 'OK Acc', type: 'Asset', balanceChf: 1, reconStatus: 'ok' }),
          account({ accountId: 2, name: 'Diff Acc', type: 'Asset', balanceChf: 1, reconStatus: 'diff', reconDiff: 12.34 }),
        ]}
        translate={translate}
      />,
    );
    const dots = container.querySelectorAll('span.rounded-full');
    // green for ok, red for diff: two distinct status colors must be present.
    const colors = Array.from(dots).map((d) => (d as HTMLElement).style.backgroundColor);
    expect(colors).toContain('rgb(34, 197, 94)'); // green #22c55e
    expect(colors).toContain('rgb(239, 68, 68)'); // red #ef4444
  });

  it('builds the recon tooltip including the diff in CHF when present', () => {
    const { container } = render(
      <AccountsTable
        accounts={[account({ accountId: 2, name: 'Diff Acc', type: 'Asset', balanceChf: 1, reconStatus: 'diff', reconDiff: 12.34 })]}
        translate={translate}
      />,
    );
    const dot = container.querySelector('span.rounded-full') as HTMLElement;
    expect(dot.getAttribute('title')).toBe('Status: diff (12.34 CHF)');
  });

  it('omits the recon tooltip when the row has no recon status', () => {
    const { container } = render(
      <AccountsTable
        accounts={[account({ accountId: 3, name: 'No Recon', type: 'Asset', balanceChf: 1 })]}
        translate={translate}
      />,
    );
    const dot = container.querySelector('span.rounded-full') as HTMLElement;
    expect(dot).not.toHaveAttribute('title');
  });

  it('marks data rows as clickable only when onSelect is provided', () => {
    const { rerender } = render(
      <AccountsTable
        accounts={[account({ accountId: 1, name: 'Bank CHF', type: 'Asset', balanceChf: 1 })]}
        onSelect={jest.fn()}
        translate={translate}
      />,
    );
    const clickableRow = screen.getByText('Bank CHF').closest('tr') as HTMLElement;
    expect(clickableRow.className).toContain('cursor-pointer');

    rerender(
      <AccountsTable
        accounts={[account({ accountId: 1, name: 'Bank CHF', type: 'Asset', balanceChf: 1 })]}
        translate={translate}
      />,
    );
    const staticRow = screen.getByText('Bank CHF').closest('tr') as HTMLElement;
    expect(staticRow.className).not.toContain('cursor-pointer');
  });

  it('renders each account type group only when accounts of that type exist', () => {
    render(
      <AccountsTable
        accounts={[account({ accountId: 1, name: 'Inc', type: 'Income', balanceChf: -10 })]}
        translate={translate}
      />,
    );
    const table = screen.getByText('Inc').closest('table') as HTMLElement;
    expect(within(table).getByText('Income')).toBeInTheDocument();
    expect(within(table).queryByText('Equity')).not.toBeInTheDocument();
  });
});
