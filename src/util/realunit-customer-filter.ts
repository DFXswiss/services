import { RealUnitCustomerListDto } from 'src/dto/realunit-compliance.dto';

// Presentation-only filtering for the RealUnit compliance customer list. The API keeps returning the
// complete customer set (completeness is the compliance requirement); these helpers only decide what is
// shown by default. Hidden rows stay one toggle away and are always counted visibly, never dropped.

// Known internal test accounts, identified by their registration mail. Deliberately an explicit list of
// exact patterns instead of a heuristic (e.g. "+ in the mail"), so a real customer can never match.
export const TEST_ACCOUNT_MAIL_PATTERNS: RegExp[] = [/^cyrill15(\+[^@]*)?@gmail\.com$/i];

export function isTestAccount(customer: RealUnitCustomerListDto): boolean {
  const mail = customer.mail;
  return mail != null && TEST_ACCOUNT_MAIL_PATTERNS.some((p) => p.test(mail));
}

// "Empty" = wallet created, nothing else yet: no name, no mail, no KYC progress, no REALU holdings.
// An undefined balance means "could not be resolved" and is treated as no holdings for display purposes.
export function isEmptyAccount(customer: RealUnitCustomerListDto): boolean {
  return !customer.name && !customer.mail && !(Number(customer.kycLevel) > 0) && !customer.balance;
}

export interface CustomerPartition {
  regular: RealUnitCustomerListDto[];
  empty: RealUnitCustomerListDto[];
  test: RealUnitCustomerListDto[];
}

// Every customer lands in exactly one bucket (test wins over empty), so the counts always add up to the
// full list and no account can be double-counted or lost.
export function partitionCustomers(customers: RealUnitCustomerListDto[]): CustomerPartition {
  const partition: CustomerPartition = { regular: [], empty: [], test: [] };
  for (const customer of customers) {
    if (isTestAccount(customer)) partition.test.push(customer);
    else if (isEmptyAccount(customer)) partition.empty.push(customer);
    else partition.regular.push(customer);
  }
  return partition;
}
