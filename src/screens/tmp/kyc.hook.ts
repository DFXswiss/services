import { Country } from '@dfx.swiss/react';
import { useMemo } from 'react';

// info
export enum LimitPeriod {
  DAY = 'Day',
  YEAR = 'Year',
}

export interface TradingLimit {
  limit: number;
  period: LimitPeriod;
}

export interface KycInfo {
  kycLevel: number;
  tradingLimit: TradingLimit;
  twoFactorEnabled: boolean;
  kycSteps: KycStep[];
}

export interface KycSession extends KycInfo {
  currentStep?: KycStepSession;
}

// steps
export enum KycStepName {
  CONTACT_DATA = 'ContactData',
  PERSONAL_DATA = 'PersonalData',
  IDENT = 'Ident',
  FINANCIAL_DATA = 'FinancialData',
  DOCUMENT_UPLOAD = 'DocumentUpload',
}

export enum KycStepType {
  // ident
  AUTO = 'Auto',
  VIDEO = 'Video',
  MANUAL = 'Manual',
  // document
  // TODO
}

export enum KycStepStatus {
  NOT_STARTED = 'NotStarted',
  IN_PROGRESS = 'InProgress',
  IN_REVIEW = 'InReview',
  FAILED = 'Failed',
  COMPLETED = 'Completed',
}

export enum UrlType {
  BROWSER = 'Browser',
  API = 'API',
}

export interface KycSessionInfo {
  url: string;
  type: UrlType;
}

export interface KycStepBase {
  name: KycStepName;
  type?: KycStepType;
  status: KycStepStatus;
  sequenceNumber: number;
}

export interface KycStep extends KycStepBase {
  isCurrent: boolean;
}

export interface KycStepSession extends KycStepBase {
  session?: KycSessionInfo;
}

// personal data
export enum AccountType {
  PERSONAL = 'Personal',
  BUSINESS = 'Business',
  SOLE_PROPRIETORSHIP = 'SoleProprietorship',
}

export interface KycContactData {
  mail: string;
}

export interface KycAddress {
  street: string;
  houseNumber?: string;
  city: string;
  zip: string;
  country: Country;
}

export interface KycPersonalData {
  accountType: AccountType;
  firstName: string;
  lastName: string;
  phone: string;
  address: KycAddress;
  organizationName?: string;
  organizationAddress?: KycAddress;
}

// financial data
export enum QuestionType {
  CONFIRMATION = 'Confirmation',
  SINGLE_CHOICE = 'SingleChoice',
  MULTIPLE_CHOICE = 'MultipleChoice',
  TEXT = 'Text',
}

export interface KycFinancialResponse {
  key: string;
  value: string;
}

export interface KycFinancialResponses {
  responses: KycFinancialResponse[];
}

export interface KycFinancialOption {
  key: string;
  text: string;
}

export interface KycFinancialQuestion {
  key: string;
  type: QuestionType;
  title: string;
  description: string;
  options?: KycFinancialOption[];
}

export interface KycFinancialQuestions extends KycFinancialResponses {
  questions: KycFinancialQuestion[];
}

export interface KycResult {
  status: KycStepStatus;
}

export function isStepDone(result: KycResult): boolean {
  return [KycStepStatus.IN_REVIEW, KycStepStatus.COMPLETED].includes(result.status);
}

// --- //

const kycUrl = `${process.env.REACT_APP_API_URL}/v2/kyc`;

export interface CallConfig {
  url: string;
  code: string;
  method: 'GET' | 'PUT' | 'POST' | 'DELETE';
  data?: any;
  noJson?: boolean;
}

// --- //

interface KycInterface {
  // process
  getKycInfo: (code: string) => Promise<KycInfo>;
  continueKyc: (code: string) => Promise<KycSession>;
  startStep: (code: string, name: KycStepName, type?: KycStepType) => Promise<KycSession>;
  getCountries: (code: string) => Promise<Country[]>;

  // updates
  setContactData: (code: string, url: string, data: KycContactData) => Promise<KycResult>;
  setPersonalData: (code: string, url: string, data: KycPersonalData) => Promise<KycResult>;
  getFinancialData: (code: string, url: string, lang?: string) => Promise<KycFinancialQuestions>;
  setFinancialData: (code: string, url: string, data: KycFinancialResponses) => Promise<KycResult>;
}

export function useKyc(): KycInterface {
  async function getKycInfo(code: string): Promise<KycInfo> {
    return call({ url: kycUrl, code, method: 'GET' });
  }

  async function continueKyc(code: string): Promise<KycSession> {
    return call({ url: kycUrl, code, method: 'PUT' });
  }

  async function startStep(code: string, name: KycStepName, type?: KycStepType): Promise<KycSession> {
    let url = `${kycUrl}/${name}`;
    type && (url += `?type=${type}`);

    return call({ url, code, method: 'GET' });
  }

  async function getCountries(code: string): Promise<Country[]> {
    return call({ url: `${kycUrl}/countries`, code, method: 'GET' });
  }

  async function setContactData(code: string, url: string, data: KycContactData): Promise<KycResult> {
    return call({ url, code, method: 'PUT', data });
  }

  async function setPersonalData(code: string, url: string, data: KycPersonalData): Promise<KycResult> {
    return call({ url, code, method: 'PUT', data });
  }

  async function getFinancialData(code: string, url: string, lang?: string): Promise<KycFinancialQuestions> {
    url += lang ? `?lang=${lang}` : '';
    return call({ url, code, method: 'GET' });
  }

  async function setFinancialData(code: string, url: string, data: KycFinancialResponses): Promise<KycResult> {
    return call({ url, code, method: 'PUT', data });
  }

  // --- HELPER METHODS --- //
  async function call<T>(config: CallConfig): Promise<T> {
    return fetch(config.url, buildInit(config)).then((response) => {
      if (response.ok) {
        return response.json().catch(() => undefined);
      }
      return response.json().then((body) => {
        throw body;
      });
    });
  }

  function buildInit({ code, method, data, noJson }: CallConfig): RequestInit {
    return {
      method: method,
      headers: {
        ...(noJson ? undefined : { 'Content-Type': 'application/json' }),
        'x-kyc-code': code,
      },
      body: noJson ? data : JSON.stringify(data),
    };
  }

  return useMemo(
    () => ({
      getKycInfo,
      continueKyc,
      startStep,
      getCountries,
      setContactData,
      setPersonalData,
      getFinancialData,
      setFinancialData,
    }),
    [],
  );
}
