import { UserDataDetail } from 'src/hooks/compliance.hook';

interface Props {
  userData: UserDataDetail;
  title: string;
}

export function CallQueueAddressInfo({ userData, title }: Props): JSX.Element {
  const rows: [string, string | undefined][] = [
    ['Street', userData.street],
    ['House Number', userData.houseNumber],
    ['ZIP', userData.zip],
    ['City', userData.location],
    ['Country', userData.country?.name ?? userData.country?.symbol],
    ['Phone Call Times', userData.phoneCallTimes],
  ];

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-base font-semibold text-dfxBlue-800 mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-1 border-b border-dfxGray-300 last:border-none">
            <span className="text-sm text-dfxGray-700">{label}</span>
            <span className="text-sm text-dfxBlue-800 font-medium text-right">{value ?? '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
