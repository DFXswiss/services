import { useEffect, useState } from 'react';

interface FilePreviewPanelProps {
  preview?: { url: string; contentType: string; name: string };
  label: string;
  onClose: () => void;
  // Must hit the API again — viewing and downloading are two audit events and must not share the
  // preview blob URL.
  onDownload?: () => void | Promise<void>;
}

// A file is shown inline when the browser can render it (images, PDF). Non-PDF files get a Download
// button that the parent must implement as a second API fetch (logged as download). PDFs have no
// Download button — save stays on the browser PDF toolbar. An image the browser cannot decode
// (e.g. HEIC outside Safari) falls back to the hint instead of a broken image.
function normalizeContentType(contentType: string): string {
  return contentType.split(';')[0].trim().toLowerCase();
}

function isPdf(contentType: string): boolean {
  return normalizeContentType(contentType) === 'application/pdf';
}

function canPreview(contentType: string): boolean {
  const normalized = normalizeContentType(contentType);
  return normalized.startsWith('image/') || isPdf(contentType);
}

export function FilePreviewPanel({ preview, label, onClose, onDownload }: FilePreviewPanelProps): JSX.Element {
  const [undecodableUrl, setUndecodableUrl] = useState<string>();
  const [isDownloading, setIsDownloading] = useState(false);
  const showHint = preview && (!canPreview(preview.contentType) || undecodableUrl === preview.url);

  useEffect(() => {
    setIsDownloading(false);
  }, [preview?.url]);

  return (
    <div className="flex-1 min-w-[400px]">
      <div className="flex justify-between items-center mb-2 gap-2">
        <h2 className="text-dfxGray-700 truncate min-w-0">{preview ? preview.name : label}</h2>
        {preview && (
          <div className="flex items-center gap-2 shrink-0">
            {onDownload && !isPdf(preview.contentType) && (
              <button
                type="button"
                disabled={isDownloading}
                className="px-3 py-1 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors disabled:opacity-50"
                onClick={() => {
                  setIsDownloading(true);
                  Promise.resolve(onDownload()).finally(() => setIsDownloading(false));
                }}
              >
                {isDownloading ? 'Downloading...' : 'Download'}
              </button>
            )}
            <button onClick={onClose} className="text-dfxGray-700 hover:text-dfxBlue-800 text-2xl font-bold px-2">
              ×
            </button>
          </div>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-sm h-[70vh] flex items-center justify-center">
        {!preview ? (
          <div className="text-dfxGray-700 text-sm">Click a file to preview</div>
        ) : showHint ? (
          <div className="text-dfxGray-700 text-sm">No preview for this format, download it instead.</div>
        ) : isPdf(preview.contentType) ? (
          <embed src={`${preview.url}#navpanes=0`} type="application/pdf" className="w-full h-full" />
        ) : (
          <img
            key={preview.url}
            src={preview.url}
            alt={preview.name}
            className="max-w-full max-h-full object-contain"
            onError={(event) => {
              if (event.currentTarget.src === preview.url) {
                setUndecodableUrl(preview.url);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
