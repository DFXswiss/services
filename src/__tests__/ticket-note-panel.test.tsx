// Unit tests for TicketNotePanel: the screen-owned draft opens and closes the composer, the composer
// is bound to the customer and the ticket, content changes flow back to the owner, and a saved note
// clears the draft and shows the confirmation.

const mockComposer = jest.fn();

jest.mock('src/components/compliance/note-composer', () => ({
  NoteComposer: (props: {
    userDataId: number;
    initialSubject: string;
    content: string;
    onContentChange: (text: string) => void;
    onCreated: () => void;
    onSubmittingChange?: (isSubmitting: boolean) => void;
  }) => {
    mockComposer(props);
    return (
      <div>
        <textarea
          data-testid="composer"
          value={props.content}
          onChange={(e) => props.onContentChange(e.target.value)}
        />
        <button type="button" data-testid="save" onClick={props.onCreated}>
          save
        </button>
        <button type="button" data-testid="start-submit" onClick={() => props.onSubmittingChange?.(true)}>
          start-submit
        </button>
        <button type="button" data-testid="end-submit" onClick={() => props.onSubmittingChange?.(false)}>
          end-submit
        </button>
      </div>
    );
  },
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { TicketNotePanel } from 'src/components/support/ticket-note-panel';

describe('TicketNotePanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks the owner to open an empty draft and to drop it on Cancel', () => {
    const onDraftChange = jest.fn();
    const { rerender } = render(<TicketNotePanel userDataId={7} issueId={42} onDraftChange={onDraftChange} />);
    expect(screen.queryByTestId('composer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Notiz hinzufügen' }));
    expect(onDraftChange).toHaveBeenCalledWith({ text: '' });

    rerender(<TicketNotePanel userDataId={7} issueId={42} draft={{ text: '' }} onDraftChange={onDraftChange} />);
    expect(screen.getByTestId('composer')).toBeInTheDocument();
    expect(mockComposer).toHaveBeenLastCalledWith(
      expect.objectContaining({ userDataId: 7, initialSubject: 'Support-Ticket 42', content: '' }),
    );
    expect(screen.getByText(/nicht an den Kunden gesendet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onDraftChange).toHaveBeenLastCalledWith(undefined);
  });

  it('reports typed content to the owner and renders whatever the owner holds', () => {
    const onDraftChange = jest.fn();
    const { rerender } = render(
      <TicketNotePanel userDataId={7} issueId={42} draft={{ text: 'Wichtig' }} onDraftChange={onDraftChange} />,
    );
    expect(screen.getByTestId('composer')).toHaveValue('Wichtig');

    fireEvent.change(screen.getByTestId('composer'), { target: { value: 'Wichtig!' } });
    expect(onDraftChange).toHaveBeenCalledWith({ text: 'Wichtig!' });

    rerender(
      <TicketNotePanel
        userDataId={7}
        issueId={42}
        draft={{ text: 'Wichtig!\n\nMehr' }}
        onDraftChange={onDraftChange}
      />,
    );
    expect(screen.getByTestId('composer')).toHaveValue('Wichtig!\n\nMehr');
  });

  it('drops the draft after saving, shows the confirmation and hides it on the next open', () => {
    const onDraftChange = jest.fn();
    const { rerender } = render(
      <TicketNotePanel userDataId={7} issueId={42} draft={{ text: 'Wichtig' }} onDraftChange={onDraftChange} />,
    );

    fireEvent.click(screen.getByTestId('save'));
    expect(onDraftChange).toHaveBeenLastCalledWith(undefined);

    rerender(<TicketNotePanel userDataId={7} issueId={42} onDraftChange={onDraftChange} />);
    expect(screen.queryByTestId('composer')).not.toBeInTheDocument();
    expect(screen.getByText(/Gespeichert/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Notiz hinzufügen' }));
    expect(screen.queryByText(/Gespeichert/)).not.toBeInTheDocument();
  });

  it('disables Cancel while the composer is submitting and re-enables it afterwards', () => {
    const onDraftChange = jest.fn();
    render(
      <TicketNotePanel userDataId={7} issueId={42} draft={{ text: 'Wichtig' }} onDraftChange={onDraftChange} />,
    );

    const cancel = () => screen.getByRole('button', { name: 'Abbrechen' });

    fireEvent.click(screen.getByTestId('start-submit'));
    expect(cancel()).toBeDisabled();
    fireEvent.click(cancel());
    expect(onDraftChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('end-submit'));
    expect(cancel()).toBeEnabled();
    fireEvent.click(cancel());
    expect(onDraftChange).toHaveBeenCalledWith(undefined);
  });
});
