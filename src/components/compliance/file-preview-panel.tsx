import { useState } from 'react';

interface FilePreviewPanelProps {
  preview?: { url: string; contentType: string; name: string };
  label: string;
  onClose: () => void;
}

// A file is shown inline when the browser can render it (images, PDF). A PDF is saved through the
// browser viewer's own toolbar; every other file gets a download link that saves it under its
// original name (the preview holds the object URL of the loaded blob, so no second request). An
// image the browser cannot decode (e.g. HEIC outside Safari) falls back to the hint instead of a
// broken image.
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

export function FilePreviewPanel({ preview, label, onClose }: FilePreviewPanelProps): JSX.Element {
  const [undecodableUrl, setUndecodableUrl] = useState<string>();
  const showHint = preview && (!canPreview(preview.contentType) || undecodableUrl === preview.url);

  return (
    <div className="flex-1 min-w-[400px]">
      <div className="flex justify-between items-center mb-2 gap-2">
        <h2 className="text-dfxGray-700 truncate min-w-0">{preview ? preview.name : label}</h2>
        {preview && (
          <div className="flex items-center gap-2 shrink-0">
            {!isPdf(preview.contentType) && (
              <a
                href={preview.url}
                download={preview.name}
                className="px-3 py-1 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors"
              >
                Download
              </a>
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
