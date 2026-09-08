// Unit tests for FilePreviewPanel: placeholder without a file, inline preview for images and PDFs,
// a hint for other formats, and a Download button for non-PDFs that calls onDownload (a second API fetch).
// PDFs never show the Download button — save stays on the browser PDF toolbar.

import { act, fireEvent, render, screen } from '@testing-library/react';
import { FilePreviewPanel } from 'src/components/compliance/file-preview-panel';

describe('FilePreviewPanel', () => {
  it('shows the label and a hint while no file is selected', () => {
    render(<FilePreviewPanel label="Dateien" onClose={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'Dateien' })).toBeInTheDocument();
    expect(screen.getByText('Click a file to preview')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('renders an image inline and calls onDownload instead of reusing the preview blob', async () => {
    const onClose = jest.fn();
    const onDownload = jest.fn();
    render(
      <FilePreviewPanel
        preview={{ url: 'blob:img', contentType: 'image/jpeg', name: 'ausweis.jpg' }}
        label="Dateien"
        onClose={onClose}
        onDownload={onDownload}
      />,
    );

    expect(screen.getByRole('heading', { name: 'ausweis.jpg' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'ausweis.jpg' })).toHaveAttribute('src', 'blob:img');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    });
    expect(onDownload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('embeds a PDF and does not show a Download button even when onDownload is passed', () => {
    const onDownload = jest.fn();
    const { container } = render(
      <FilePreviewPanel
        preview={{ url: 'blob:pdf', contentType: 'application/pdf', name: 'vertrag.pdf' }}
        label="Dateien"
        onClose={jest.fn()}
        onDownload={onDownload}
      />,
    );
    expect(container.querySelector('embed')).toHaveAttribute('src', 'blob:pdf#navpanes=0');
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    expect(onDownload).not.toHaveBeenCalled();
  });

  it('offers hint and Download for formats the browser cannot show when onDownload is passed', () => {
    const onDownload = jest.fn();
    const { container } = render(
      <FilePreviewPanel
        preview={{ url: 'blob:heic', contentType: 'image/heic', name: 'foto.heic' }}
        label="Dateien"
        onClose={jest.fn()}
        onDownload={onDownload}
      />,
    );
    // image/* is handed to the browser first; once it cannot decode the image, the hint takes over
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    fireEvent.error(img);
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByText('No preview for this format, download it instead.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();

    render(
      <FilePreviewPanel
        preview={{ url: 'blob:doc', contentType: 'application/msword', name: 'brief.doc' }}
        label="Dateien"
        onClose={jest.fn()}
        onDownload={onDownload}
      />,
    );
    expect(screen.getAllByText('No preview for this format, download it instead.')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(2);
    expect(container.querySelector('embed')).not.toBeInTheDocument();
  });

  it('shows a JPEG again after a HEIC decode error on the same panel instance', () => {
    const { container, rerender } = render(
      <FilePreviewPanel
        preview={{ url: 'blob:heic', contentType: 'image/heic', name: 'foto.heic' }}
        label="Dateien"
        onClose={jest.fn()}
      />,
    );
    const heicImg = container.querySelector('img') as HTMLImageElement;
    fireEvent.error(heicImg);
    expect(container.querySelector('img')).not.toBeInTheDocument();

    rerender(
      <FilePreviewPanel
        preview={{ url: 'blob:jpeg', contentType: 'image/jpeg', name: 'foto.jpg' }}
        label="Dateien"
        onClose={jest.fn()}
      />,
    );

    const jpegImg = screen.getByRole('img', { name: 'foto.jpg' });
    expect(jpegImg).toHaveAttribute('src', 'blob:jpeg');
    expect(screen.queryByText('No preview for this format, download it instead.')).not.toBeInTheDocument();
  });

  it('renders an image when contentType uses mixed case', () => {
    const { container } = render(
      <FilePreviewPanel
        preview={{ url: 'blob:img-mixed', contentType: 'Image/jpeg', name: 'ausweis.jpg' }}
        label="Dateien"
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole('img', { name: 'ausweis.jpg' })).toHaveAttribute('src', 'blob:img-mixed');
    expect(screen.queryByText('No preview for this format, download it instead.')).not.toBeInTheDocument();
    expect(container.querySelector('embed')).not.toBeInTheDocument();
  });

  it('embeds a PDF when contentType uses mixed case and hides Download even if onDownload is passed', () => {
    const onDownload = jest.fn();
    const { container } = render(
      <FilePreviewPanel
        preview={{ url: 'blob:pdf-mixed', contentType: 'Application/PDF', name: 'vertrag.pdf' }}
        label="Dateien"
        onClose={jest.fn()}
        onDownload={onDownload}
      />,
    );
    expect(container.querySelector('embed')).toHaveAttribute('src', 'blob:pdf-mixed#navpanes=0');
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    expect(onDownload).not.toHaveBeenCalled();
  });

  it('ignores a stale image error whose src no longer matches preview.url', () => {
    const { container } = render(
      <FilePreviewPanel
        preview={{ url: 'blob:img', contentType: 'image/jpeg', name: 'ausweis.jpg' }}
        label="Dateien"
        onClose={jest.fn()}
      />,
    );

    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    img.src = 'blob:other';
    fireEvent.error(img);

    expect(screen.queryByText('No preview for this format, download it instead.')).not.toBeInTheDocument();
    expect(container.querySelector('img')).toBeInTheDocument();
  });
});
