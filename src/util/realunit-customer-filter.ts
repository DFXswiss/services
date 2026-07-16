import { RealUnitCustomerListDto } from 'src/dto/realunit-compliance.dto';

// Presentation-only filtering for the RealUnit compliance customer list. The API keeps returning the
// complete customer set (completeness is the compliance requirement); this helper only decides what is
// shown by default. Hidden rows stay one toggle away and are always counted visibly, never dropped.
//
// "Empty" = wallet created, nothing else yet: no name, no mail, no KYC progress (in either direction —
// a terminated/rejected account has a non-zero level and stays visible), and a RESOLVED zero balance.
// An undefined balance means "could not be resolved" (e.g. indexer outage) and fails open to visible,
// so an infrastructure failure can never hide a real REALU holder.
export function isEmptyAccount(customer: RealUnitCustomerListDto): boolean {
  return !customer.name && !customer.mail && Number(customer.kycLevel ?? 0) === 0 && customer.balance === 0;
}
