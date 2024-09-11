import { CopyButton } from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import QRCode from 'react-qr-code';

interface QrCopyProps {
  data: string;
  isLoading?: boolean;
}

export function QrCopy({ data }: QrCopyProps): JSX.Element {
  return (
    <div className="relative w-full max-w-[20rem]">
      <div
        className="absolute bg-white border p-1 rounded-sm top-1/2 left-1/2"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <CopyButton onCopy={() => copy(data)} />
      </div>
      <QrBasic data={data} />
    </div>
  );
}

export function QrBasic({ data, isLoading }: QrCopyProps): JSX.Element {
  return (
    <div className={`p-2 border border-dfxGray-500 rounded-md ${isLoading ? 'animate-pulse border-dfxGray-300' : ''}`}>
      <QRCode
        className="mx-auto h-auto w-full max-w-[15rem] rounded-sm"
        value={data}
        fgColor={isLoading ? '#0000000A' : '#072440'}
      />
    </div>
  );
}
