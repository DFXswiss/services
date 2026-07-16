import { RealUnitCustomerListDto } from 'src/dto/realunit-compliance.dto';

// Presentation-only filtering for the RealUnit compliance customer list. The API keeps returning the
// complete customer set (completeness is the compliance requirement); this helper only decides what is
// shown by default. Hidden rows stay one toggle away and are always counted visibly, never dropped.
//
// "Empty" = wallet created, nothing else yet: no name, no mail, an untouched KYC state (status still NA
// AND level 0 in either direction — a terminated/rejected account has a non-NA status and a non-zero
// level and stays visible), and a RESOLVED zero balance.
// An undefined balance means "could not be resolved" (e.g. indexer outage) and fails open to visible,
// so an infrastructure failure can never hide a real REALU holder. Likewise a missing (undefined/null)
// kycLevel is "could not be resolved" and fails open to visible; only a RESOLVED level of 0 counts as
// "no progress".
export function isEmptyAccount(customer: RealUnitCustomerListDto): boolean {
  return (
    !customer.name &&
    !customer.mail &&
    customer.kycStatus === 'NA' &&
    customer.kycLevel != null &&
    Number(customer.kycLevel) === 0 &&
    customer.balance === 0
  );
}
