// Unit tests for FilePreviewPanel: placeholder without a file, inline preview for images and PDFs,
// a hint for other formats, and the download link every loaded file gets.

import { fireEvent, render, screen } from '@testing-library/react';
import { FilePreviewPanel } from 'src/components/compliance/file-preview-panel';

describe('FilePreviewPanel', () => {
  it('shows the label and a hint while no file is selected', () => {
    render(<FilePreviewPanel label="Dateien" onClose={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'Dateien' })).toBeInTheDocument();
    expect(screen.getByText('Click a file to preview')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders an image inline with a download link under its original name and closes', () => {
    const onClose = jest.fn();
    render(
      <FilePreviewPanel
        preview={{ url: 'blob:img', contentType: 'image/jpeg', name: 'ausweis.jpg' }}
        label="Dateien"
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('heading', { name: 'ausweis.jpg' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'ausweis.jpg' })).toHaveAttribute('src', 'blob:img');
    const link = screen.getByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('href', 'blob:img');
    expect(link).toHaveAttribute('download', 'ausweis.jpg');

    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('embeds a PDF and leaves the download to the viewer toolbar', () => {
    const { container } = render(
      <FilePreviewPanel
        preview={{ url: 'blob:pdf', contentType: 'application/pdf', name: 'vertrag.pdf' }}
        label="Dateien"
        onClose={jest.fn()}
      />,
    );
    expect(container.querySelector('embed')).toHaveAttribute('src', 'blob:pdf#navpanes=0');
    expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument();
  });

  it('offers only the download for formats the browser cannot show', () => {
    const { container } = render(
      <FilePreviewPanel
        preview={{ url: 'blob:heic', contentType: 'image/heic', name: 'foto.heic' }}
        label="Dateien"
        onClose={jest.fn()}
      />,
    );
    // image/* is handed to the browser first; once it cannot decode the image, the hint takes over
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    fireEvent.error(img);
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByText('No preview for this format, download it instead.')).toBeInTheDocument();

    render(
      <FilePreviewPanel
        preview={{ url: 'blob:doc', contentType: 'application/msword', name: 'brief.doc' }}
        label="Dateien"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getAllByText('No preview for this format, download it instead.')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Download' })).toHaveLength(2);
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
    const link = screen.getByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('href', 'blob:img-mixed');
    expect(link).toHaveAttribute('download', 'ausweis.jpg');
    expect(screen.queryByText('No preview for this format, download it instead.')).not.toBeInTheDocument();
    expect(container.querySelector('embed')).not.toBeInTheDocument();
  });

  it('embeds a PDF when contentType uses mixed case', () => {
    const { container } = render(
      <FilePreviewPanel
        preview={{ url: 'blob:pdf-mixed', contentType: 'Application/PDF', name: 'vertrag.pdf' }}
        label="Dateien"
        onClose={jest.fn()}
      />,
    );
    expect(container.querySelector('embed')).toHaveAttribute('src', 'blob:pdf-mixed#navpanes=0');
    expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument();
  });
});
