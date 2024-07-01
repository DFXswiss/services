import { CopyButton } from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import QRCode from 'react-qr-code';

interface QrCopyProps {
  data: string;
  size?: number;
}

export function QrCopy({ data, size }: QrCopyProps): JSX.Element {
  return (
    <div className="relative w-full max-w-[20rem]">
      <div
        className="absolute bg-white border p-1 rounded-sm top-1/2 left-1/2"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <CopyButton onCopy={() => copy(data)} />
      </div>
      <QRCode className="mx-auto h-auto w-full max-w-[15rem]" value={data} fgColor={'#072440'} />
    </div>
  );
}
