// Unit tests for NoteComposer: subject/content/department handling for staff and admin, the optional
// user-data-id input, the initial subject, and the save success and failure paths.

const mockCreateSupportNote = jest.fn();
const mockAuth = { role: 'Compliance' as string | undefined };

jest.mock('@dfx.swiss/react', () => ({
  Department: { SUPPORT: 'Support', COMPLIANCE: 'Compliance', MARKETING: 'Marketing', COOPERATION: 'Cooperation' },
  UserRole: { ADMIN: 'Admin', COMPLIANCE: 'Compliance', SUPPORT: 'Support' },
  useAuthContext: () => ({ session: { role: mockAuth.role } }),
}));

jest.mock('src/hooks/compliance.hook', () => ({
  useCompliance: () => ({ createSupportNote: mockCreateSupportNote }),
}));

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MAX_CONTENT_LENGTH, NoteComposer } from 'src/components/compliance/note-composer';

function content(): HTMLElement {
  return screen.getByPlaceholderText('Neue Notiz...');
}

function subject(): HTMLElement {
  return screen.getByPlaceholderText('Betreff (optional)');
}

function submit(): HTMLElement {
  return screen.getByRole('button', { name: /Notiz hinzufügen|Speichern/ });
}

describe('NoteComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.role = 'Compliance';
    mockCreateSupportNote.mockResolvedValue({});
  });

  it('saves a note bound to the given user, trims the fields and resets afterwards', async () => {
    const onCreated = jest.fn();
    render(<NoteComposer userDataId={7} onCreated={onCreated} />);

    expect(submit()).toBeDisabled();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    // mirrors the API limits (subject 256, content 8000)
    expect(subject()).toHaveAttribute('maxlength', '256');

    fireEvent.change(subject(), { target: { value: ' Betreff ' } });
    fireEvent.change(content(), { target: { value: ' Inhalt ' } });
    fireEvent.click(submit());

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(mockCreateSupportNote).toHaveBeenCalledWith('Inhalt', {
      userDataId: 7,
      subject: 'Betreff',
      department: undefined,
    });
    expect(subject()).toHaveValue('');
    expect(content()).toHaveValue('');
  });

  it('seeds the subject once and clears it after saving like the other fields', async () => {
    const onCreated = jest.fn();
    render(<NoteComposer userDataId={7} initialSubject="Support-Ticket 42" onCreated={onCreated} />);
    expect(subject()).toHaveValue('Support-Ticket 42');

    fireEvent.change(content(), { target: { value: 'Inhalt' } });
    fireEvent.click(submit());

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(mockCreateSupportNote).toHaveBeenCalledWith(
      'Inhalt',
      expect.objectContaining({ subject: 'Support-Ticket 42' }),
    );
    expect(subject()).toHaveValue('');
  });

  it('sends an empty subject as undefined and uses the custom labels', async () => {
    render(<NoteComposer userDataId={7} submitLabel="Ablegen" contentPlaceholder="Text..." onCreated={jest.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Text...'), { target: { value: 'nur Inhalt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ablegen' }));

    await waitFor(() => expect(screen.getByPlaceholderText('Text...')).toHaveValue(''));
    expect(mockCreateSupportNote).toHaveBeenCalledWith('nur Inhalt', {
      userDataId: 7,
      subject: undefined,
      department: undefined,
    });
  });

  it('requires a department from an admin and sends it', async () => {
    mockAuth.role = 'Admin';
    const onCreated = jest.fn();
    render(<NoteComposer userDataId={7} onCreated={onCreated} />);

    const department = screen.getByRole('combobox') as HTMLSelectElement;
    expect(Array.from(department.options).map((o) => o.value)).toEqual(['', 'Support', 'Compliance', 'Marketing']);

    fireEvent.change(content(), { target: { value: 'Inhalt' } });
    expect(submit()).toBeDisabled();

    fireEvent.change(department, { target: { value: 'Compliance' } });
    fireEvent.click(submit());

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(mockCreateSupportNote).toHaveBeenCalledWith('Inhalt', {
      userDataId: 7,
      subject: undefined,
      department: 'Compliance',
    });
    expect(department.value).toBe('');
  });

  it('parses the optional user-data-id input and rejects an invalid one', async () => {
    render(<NoteComposer allowUserDataIdInput initialUserDataId="12" onCreated={jest.fn()} />);
    const idInput = screen.getByPlaceholderText('User Data ID (optional)');
    expect(idInput).toHaveValue('12');

    fireEvent.change(content(), { target: { value: 'Inhalt' } });
    fireEvent.change(idInput, { target: { value: 'abc' } });
    fireEvent.click(submit());
    expect(await screen.findByText('Invalid user data id')).toBeInTheDocument();
    expect(mockCreateSupportNote).not.toHaveBeenCalled();

    fireEvent.change(idInput, { target: { value: '0' } });
    fireEvent.click(submit());
    expect(await screen.findByText('Invalid user data id')).toBeInTheDocument();

    fireEvent.change(idInput, { target: { value: ' 34 ' } });
    fireEvent.click(submit());
    await waitFor(() =>
      expect(mockCreateSupportNote).toHaveBeenCalledWith('Inhalt', expect.objectContaining({ userDataId: 34 })),
    );
    await waitFor(() => expect(idInput).toHaveValue(''));

    fireEvent.change(content(), { target: { value: 'ohne Kunde' } });
    fireEvent.click(submit());
    await waitFor(() =>
      expect(mockCreateSupportNote).toHaveBeenLastCalledWith(
        'ohne Kunde',
        expect.objectContaining({ userDataId: undefined }),
      ),
    );
    await waitFor(() => expect(content()).toHaveValue(''));
  });

  it('shows the save error, Error or not, and keeps the content', async () => {
    render(<NoteComposer userDataId={7} onCreated={jest.fn()} />);

    mockCreateSupportNote.mockRejectedValueOnce(new Error('save failed'));
    fireEvent.change(content(), { target: { value: 'Inhalt' } });
    fireEvent.click(submit());
    expect(await screen.findByText('save failed')).toBeInTheDocument();
    expect(content()).toHaveValue('Inhalt');

    mockCreateSupportNote.mockRejectedValueOnce('plain');
    fireEvent.click(submit());
    expect(await screen.findByText('Failed to save note')).toBeInTheDocument();
  });

  it('lets the caller own the content and clears it through the callback after saving', async () => {
    const onCreated = jest.fn();
    const onContentChange = jest.fn();
    const { rerender } = render(
      <NoteComposer
        userDataId={7}
        content="Kunde schrieb: Hallo"
        onContentChange={onContentChange}
        onCreated={onCreated}
      />,
    );
    expect(content()).toHaveValue('Kunde schrieb: Hallo');
    expect(submit()).toBeEnabled();

    fireEvent.change(content(), { target: { value: 'geändert' } });
    expect(onContentChange).toHaveBeenCalledWith('geändert');
    // the owner decides what is shown
    expect(content()).toHaveValue('Kunde schrieb: Hallo');

    rerender(
      <NoteComposer userDataId={7} content="geändert" onContentChange={onContentChange} onCreated={onCreated} />,
    );
    fireEvent.click(submit());
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(mockCreateSupportNote).toHaveBeenCalledWith('geändert', expect.anything());
    expect(onContentChange).toHaveBeenLastCalledWith('');
  });

  it('blocks a pre-filled content above the API limit and says how long it is', () => {
    const tooLong = 'x'.repeat(MAX_CONTENT_LENGTH + 1);
    render(<NoteComposer userDataId={7} content={tooLong} onContentChange={jest.fn()} onCreated={jest.fn()} />);
    expect(content()).toHaveAttribute('maxlength', String(MAX_CONTENT_LENGTH));
    expect(
      screen.getByText(`Notiz zu lang: ${MAX_CONTENT_LENGTH + 1} / ${MAX_CONTENT_LENGTH} Zeichen`),
    ).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('reports submitting true then false around a successful create', async () => {
    const onSubmittingChange = jest.fn();
    let resolveCreate!: (value: unknown) => void;
    mockCreateSupportNote.mockReturnValueOnce(new Promise((resolve) => (resolveCreate = resolve)));

    render(<NoteComposer userDataId={7} onCreated={jest.fn()} onSubmittingChange={onSubmittingChange} />);
    fireEvent.change(content(), { target: { value: 'Inhalt' } });
    fireEvent.click(submit());

    await waitFor(() => expect(onSubmittingChange).toHaveBeenCalledWith(true));
    expect(onSubmittingChange).not.toHaveBeenCalledWith(false);

    resolveCreate({});
    await waitFor(() => expect(onSubmittingChange).toHaveBeenCalledWith(false));
    expect(onSubmittingChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it('still calls onCreated after unmount during submit, but skips local UI callbacks', async () => {
    const onCreated = jest.fn();
    const onContentChange = jest.fn();
    const onSubmittingChange = jest.fn();
    let resolveCreate!: (value: unknown) => void;
    mockCreateSupportNote.mockReturnValueOnce(new Promise((resolve) => (resolveCreate = resolve)));

    const { unmount } = render(
      <NoteComposer
        userDataId={7}
        content="Inhalt"
        onContentChange={onContentChange}
        onCreated={onCreated}
        onSubmittingChange={onSubmittingChange}
      />,
    );
    fireEvent.click(submit());

    await waitFor(() => expect(onSubmittingChange).toHaveBeenCalledWith(true));
    unmount();

    await act(async () => {
      resolveCreate({});
      await Promise.resolve();
    });

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onContentChange).not.toHaveBeenCalledWith('');
    expect(onSubmittingChange).not.toHaveBeenCalledWith(false);
  });

  it('ignores a second sync click while create is in flight', async () => {
    const onCreated = jest.fn();
    let resolveCreate!: (value: unknown) => void;
    mockCreateSupportNote.mockReturnValueOnce(new Promise((resolve) => (resolveCreate = resolve)));

    render(<NoteComposer userDataId={7} onCreated={onCreated} />);
    fireEvent.change(content(), { target: { value: 'Inhalt' } });
    fireEvent.click(submit());
    fireEvent.click(submit());

    expect(mockCreateSupportNote).toHaveBeenCalledTimes(1);

    resolveCreate({});
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });
});
