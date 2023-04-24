import { Country } from './country';

export const KycUrl = { setData: 'kyc/data' };

export enum AccountType {
  PERSONAL = 'Personal',
  BUSINESS = 'Business',
  SOLE_PROPRIETORSHIP = 'SoleProprietorship',
}

export enum KycStatus {
  NA = 'NA',
  CHATBOT = 'Chatbot',
  ONLINE_ID = 'OnlineId',
  VIDEO_ID = 'VideoId',
  CHECK = 'Check',
  COMPLETED = 'Completed',
  REJECTED = 'Rejected',
}

export enum KycState {
  NA = 'NA',
  FAILED = 'Failed',
  REMINDED = 'Reminded',
  REVIEW = 'Review',
}

export interface KycData {
  accountType: AccountType;
  firstname: string;
  surname: string;
  street: string;
  houseNumber: string;
  zip: string;
  location: string;
  country: Country;

  mail: string;
  phone: string;

  organizationName: string;
  organizationStreet: string;
  organizationHouseNumber: string;
  organizationLocation: string;
  organizationZip: string;
  organizationCountry: Country;
}
