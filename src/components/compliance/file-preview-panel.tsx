interface FilePreviewPanelProps {
  preview?: { url: string; contentType: string; name: string };
  label: string;
  onClose: () => void;
}

export function FilePreviewPanel({ preview, label, onClose }: FilePreviewPanelProps): JSX.Element {
  return (
    <div className="flex-1 min-w-[400px]">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-dfxGray-700">{preview ? preview.name : label}</h2>
        {preview && (
          <button onClick={onClose} className="text-dfxGray-700 hover:text-dfxBlue-800 text-2xl font-bold px-2">
            ×
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-sm h-[70vh] flex items-center justify-center">
        {preview ? (
          preview.contentType.includes('pdf') ? (
            <embed src={`${preview.url}#navpanes=0`} type="application/pdf" className="w-full h-full" />
          ) : (
            <img src={preview.url} alt={preview.name} className="max-w-full max-h-full object-contain" />
          )
        ) : (
          <div className="text-dfxGray-700 text-sm">Click a file to preview</div>
        )}
      </div>
    </div>
  );
}
