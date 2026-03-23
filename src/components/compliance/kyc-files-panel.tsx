import { KycFile } from 'src/hooks/compliance.hook';

interface KycFilesPanelProps {
  kycFiles: KycFile[];
  label: string;
  onOpenFile: (file: KycFile) => void;
}

export function KycFilesPanel({ kycFiles, label, onOpenFile }: KycFilesPanelProps): JSX.Element {
  return (
    <div className="border-t border-dfxGray-500 pt-4">
      <h2 className="text-dfxGray-700 mb-2">
        {label} ({kycFiles?.length || 0})
      </h2>
      <div className="bg-white rounded-lg shadow-sm max-h-[35vh] overflow-auto scroll-shadow">
        {kycFiles?.length > 0 ? (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-dfxGray-300">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">ID</th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Name</th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Type</th>
              </tr>
            </thead>
            <tbody>
              {kycFiles.map((file) => (
                <tr
                  key={file.id}
                  className="group border-b border-dfxGray-300 transition-colors hover:bg-dfxBlue-400 cursor-pointer"
                  onClick={() => onOpenFile(file)}
                >
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left group-hover:text-white">{file.id}</td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-center group-hover:text-white underline">
                    {file.name}
                  </td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-center group-hover:text-white">{file.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-dfxGray-700 text-sm">No KYC files</div>
        )}
      </div>
    </div>
  );
}
