import { RecallInfo } from 'src/hooks/compliance.hook';
import { DetailRow, formatDateTime } from 'src/util/compliance-helpers';

export function RecallDetails({ recall }: { recall: RecallInfo }): JSX.Element {
  return (
    <table className="text-sm text-dfxBlue-800 text-left">
      <tbody>
        <DetailRow label="ID" value={recall.id} />
        <DetailRow label="Created" value={formatDateTime(recall.created)} />
        <DetailRow label="Sequence" value={recall.sequence} />
        <DetailRow label="Reason" value={recall.reason} />
        <DetailRow label="Fee" value={recall.fee} />
        <DetailRow label="Comment" value={recall.comment} />
      </tbody>
    </table>
  );
}
