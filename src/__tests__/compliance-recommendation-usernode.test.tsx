// Focused FIX E test: keyboard (Enter/Space) and mouse click on a UserNode must invoke
// data.onActivate directly - never via a synthesized bubbling DOM click.
//
// UserNode lives in the screen module, which transitively loads several heavy deps at import time;
// we mock just enough to render the node standalone inside a ReactFlowProvider (Handle needs context).

jest.mock('reactflow/dist/style.css', () => ({}), { virtual: true });
jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { SM: 'sm', LG: 'lg' },
  StyledLoadingSpinner: () => null,
}));
jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_: string, d: string) => d }),
}));
jest.mock('src/hooks/compliance.hook', () => ({ useCompliance: () => ({}) }));
jest.mock('src/hooks/guard.hook', () => ({ useComplianceGuard: () => undefined }));
jest.mock('src/hooks/layout-config.hook', () => ({ useLayoutOptions: () => undefined }));
jest.mock('src/components/error-hint', () => ({ ErrorHint: () => null }));

import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { UserNode } from '../screens/compliance-recommendation-graph.screen';
import { UserNodeData } from '../util/recommendation-graph.util';

function renderNode(onActivate: (id: number) => void) {
  const data: UserNodeData = {
    id: 42,
    isCenter: false,
    isExpandable: true,
    isExpanded: false,
    isLoading: false,
    expandLabel: 'Load connections',
    onActivate,
  };
  return render(
    <ReactFlowProvider>
      <UserNode data={data} />
    </ReactFlowProvider>,
  );
}

describe('UserNode keyboard/click activation (FIX E)', () => {
  it('invokes onActivate(id) on a mouse click', () => {
    const onActivate = jest.fn();
    renderNode(onActivate);
    fireEvent.click(screen.getByRole('button'));
    expect(onActivate).toHaveBeenCalledWith(42);
  });

  it('invokes onActivate(id) on Enter, without relying on a synthesized click', () => {
    const onActivate = jest.fn();
    renderNode(onActivate);
    const el = screen.getByRole('button');
    // a synthesized click would also call onClick; assert the keydown path alone fires exactly once
    const clickSpy = jest.spyOn(el, 'click');
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith(42);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('invokes onActivate(id) on Space, without relying on a synthesized click', () => {
    const onActivate = jest.fn();
    renderNode(onActivate);
    const el = screen.getByRole('button');
    const clickSpy = jest.spyOn(el, 'click');
    fireEvent.keyDown(el, { key: ' ' });
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith(42);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('ignores other keys', () => {
    const onActivate = jest.fn();
    renderNode(onActivate);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'a' });
    expect(onActivate).not.toHaveBeenCalled();
  });
});
