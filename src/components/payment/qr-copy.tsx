import { CopyButton } from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import QRCode from 'react-qr-code';

export function QrCopy({ data }: { data: string }): JSX.Element {
  return (
    <div className="relative">
      <div
        className="absolute bg-white border p-1 rounded-sm top-1/2 left-1/2"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <CopyButton onCopy={() => copy(data)} />
      </div>
      <QRCode className="mx-auto" value={data} size={128} fgColor={'#072440'} />
    </div>
  );
}
