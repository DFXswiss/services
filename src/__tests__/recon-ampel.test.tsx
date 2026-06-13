import { render } from '@testing-library/react';
import { ReconAmpel } from 'src/components/ledger/recon-ampel';
import { AMPEL_HEX } from 'src/util/ledger';

describe('ReconAmpel', () => {
  it('renders a dot with the green hex for a green color', () => {
    const { container } = render(<ReconAmpel color="green" />);
    const dot = container.querySelector('span');
    expect(dot).not.toBeNull();
    // backgroundColor is the load-bearing assertion: a wrong mapping would paint the wrong status.
    expect(dot).toHaveStyle({ backgroundColor: AMPEL_HEX.green });
  });

  it('renders the red hex for a red color', () => {
    const { container } = render(<ReconAmpel color="red" />);
    expect(container.querySelector('span')).toHaveStyle({ backgroundColor: AMPEL_HEX.red });
  });

  it('renders the orange hex for an orange color', () => {
    const { container } = render(<ReconAmpel color="orange" />);
    expect(container.querySelector('span')).toHaveStyle({ backgroundColor: AMPEL_HEX.orange });
  });

  it('renders the gray hex for a gray color', () => {
    const { container } = render(<ReconAmpel color="gray" />);
    expect(container.querySelector('span')).toHaveStyle({ backgroundColor: AMPEL_HEX.gray });
  });

  it('passes the title attribute through for the tooltip', () => {
    const { container } = render(<ReconAmpel color="green" title="Status: ok" />);
    expect(container.querySelector('span')).toHaveAttribute('title', 'Status: ok');
  });

  it('omits the title attribute when none is given', () => {
    const { container } = render(<ReconAmpel color="green" />);
    expect(container.querySelector('span')).not.toHaveAttribute('title');
  });
});
