import { IpLogInfo } from 'src/hooks/compliance.hook';

interface Props {
  ipLogs: IpLogInfo[];
  title: string;
}

export function CallQueueIpCountries({ ipLogs, title }: Props): JSX.Element {
  const countries = Array.from(new Set(ipLogs.map((l) => l.country).filter((c): c is string => !!c))).sort();

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-base font-semibold text-dfxBlue-800 mb-3">{title}</h3>
      {countries.length === 0 ? (
        <span className="text-sm text-dfxGray-700">-</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {countries.map((c) => (
            <span key={c} className="px-2 py-1 text-xs font-medium bg-dfxGray-300 text-dfxBlue-800 rounded">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
