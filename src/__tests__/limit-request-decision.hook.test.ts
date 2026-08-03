import { renderHook } from '@testing-library/react';

// capture the api call args; call() resolves to the value we set per test
const mockCall = jest.fn();

// Same shape as the other compliance hook tests: `call` comes from useGuardedApi (→ useApi), and the
// module reads Department at import time.
jest.mock('@dfx.swiss/react', () => ({
  useApi: () => ({ call: mockCall }),
  Department: { SUPPORT: 'Support', COMPLIANCE: 'Compliance', MARKETING: 'Marketing' },
  TfaLevel: { STRICT: 'Strict' },
  ResponseType: { BLOB: 'blob' },
  // compliance.hook builds a CallOutcome → PhoneCallStatus map at module scope.
  PhoneCallStatus: {
    COMPLETED: 'Completed',
    UNAVAILABLE: 'Unavailable',
    SUSPICIOUS: 'Suspicious',
    FAILED: 'Failed',
  },
  CheckStatus: { PASS: 'Pass', FAIL: 'Fail' },
  AmlReason: { MANUAL_CHECK_PHONE_FAILED: 'ManualCheckPhoneFailed' },
  CallQueue: {
    MANUAL_CHECK_PHONE: 'ManualCheckPhone',
    MANUAL_CHECK_IP_PHONE: 'ManualCheckIpPhone',
    MANUAL_CHECK_IP_COUNTRY_PHONE: 'ManualCheckIpCountryPhone',
    MANUAL_CHECK_EXTERNAL_ACCOUNT_PHONE: 'ManualCheckExternalAccountPhone',
    UNAVAILABLE_SUSPICIOUS: 'UnavailableSuspicious',
  },
}));

// useGuardedApi calls useNavigation (react-router hooks); stub it so renderHook works without a Router.
jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import { LimitRequestDecision, useCompliance } from '../hooks/compliance.hook';

const CONTEXT = { limitRequestId: 855, userDataId: 397328 };

function callsTo(url: string) {
  return mockCall.mock.calls.map(([args]) => args).filter((a) => a.url === url);
}

describe('useCompliance().decideLimitRequest', () => {
  beforeEach(() => {
    mockCall.mockReset().mockResolvedValue(undefined);
  });

  // Mirrors the sheet's accept sequence: userData/{id} carries the new depositLimit, limitRequest/{id}
  // carries the decision. Nothing in the API derives the annual limit from the request, so dropping the
  // first call would record an acceptance that leaves the customer on the old limit.
  it('raises the annual limit, then records an acceptance, then files the note', async () => {
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.ACCEPTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      grantedLimit: 500000,
      currentDepositLimit: 100000,
      fundOrigin: 'Savings',
      investmentDate: 'Now',
    });

    expect(outcome).toEqual({
      success: true,
      completedSteps: ['depositLimit', 'limitRequest', 'report', 'log'],
    });

    const urls = mockCall.mock.calls.map(([a]) => `${a.method} ${a.url}`);
    expect(urls).toEqual([
      'PUT userData/397328',
      'PUT limitRequest/855',
      'POST support/397328/limit-request-pdf',
      'POST kyc/admin/log',
    ]);

    // The report is the file record the sheet produced for every final decision.
    expect(callsTo('support/397328/limit-request-pdf')[0].data).toEqual({
      decision: 'Accepted',
      clerk: 'JR',
      requestedLimit: 500000,
      grantedLimit: 500000,
      previousLimit: 100000,
      fundOrigin: 'Savings',
      investmentDate: 'Now',
      note: undefined,
    });

    expect(callsTo('userData/397328')[0].data).toEqual({ depositLimit: 500000 });

    const decision = callsTo('limitRequest/855')[0].data;
    expect(decision).toMatchObject({ decision: 'Accepted', acceptedLimit: 500000, clerk: 'JR' });
    expect(typeof decision.edited).toBe('string');

    const log = callsTo('kyc/admin/log')[0].data;
    expect(log).toMatchObject({ type: 'ManualLog', userData: { id: 397328 } });
    expect(log.comment).toContain('Services - LimitRequest');
    expect(log.comment).toContain('Editor: JR');
    expect(log.comment).toContain('userData-depositLimit-500000');
    expect(log.comment).toContain('limitRequest-decision-Accepted');
  });

  it('uses the edited amount for a partial acceptance', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.PARTIALLY_ACCEPTED, {
      clerk: 'VR',
      requestedLimit: 500000,
      grantedLimit: 200000,
      currentDepositLimit: 100000,
    });

    expect(callsTo('userData/397328')[0].data).toEqual({ depositLimit: 200000 });
    expect(callsTo('limitRequest/855')[0].data).toMatchObject({
      decision: 'PartiallyAccepted',
      acceptedLimit: 200000,
    });
  });

  // A rejection must not touch the account. The sheet records the limit that stays in force on the
  // request itself (its rejected rows carry the account's existing limit), which is what makes a
  // rejected request readable afterwards.
  it('leaves the account untouched on a rejection and records the limit that stays in force', async () => {
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.REJECTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      currentDepositLimit: 100000,
    });

    expect(outcome.completedSteps).toEqual(['limitRequest', 'report', 'log']);
    // A rejection is filed too: it is exactly the case someone asks about later.
    expect(callsTo('support/397328/limit-request-pdf')[0].data).toMatchObject({
      decision: 'Rejected',
      previousLimit: 100000,
      grantedLimit: undefined,
    });
    expect(callsTo('userData/397328')).toHaveLength(0);
    expect(callsTo('limitRequest/855')[0].data).toMatchObject({
      decision: 'Rejected',
      acceptedLimit: 100000,
      clerk: 'JR',
    });
    expect(callsTo('kyc/admin/log')[0].data.comment).not.toContain('depositLimit');
  });

  it('omits acceptedLimit entirely when no limit is known for a rejection', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.REJECTED, {
      clerk: 'JR',
      requestedLimit: 500000,
    });

    // Absent rather than null: the API validator rejects a null and keeps the stored value when the
    // field is missing.
    expect(callsTo('limitRequest/855')[0].data).not.toHaveProperty('acceptedLimit');
  });

  it('carries the file note into the log comment', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.REJECTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      currentDepositLimit: 100000,
      comment: 'Unterlagen nicht nachgereicht',
    });

    expect(callsTo('kyc/admin/log')[0].data.comment).toContain('comment: Unterlagen nicht nachgereicht');
    // The same note becomes the body of the filed report ("Interne Aktennotiz" in the sheet).
    expect(callsTo('support/397328/limit-request-pdf')[0].data.note).toBe('Unterlagen nicht nachgereicht');
  });

  // The customer's proof of funds is filed with the note in one call: the API stores the file under the
  // account's UserNotes and links it to this log entry, so document and explanation stay together.
  it('files the customer document together with the note', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.ACCEPTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      grantedLimit: 500000,
      currentDepositLimit: 100000,
      comment: 'Hausverkauf',
      attachment: { data: 'data:application/pdf;base64,QQ==', name: 'Kaufvertrag.pdf' },
    });

    const log = callsTo('kyc/admin/log')[0].data;
    expect(log.file).toBe('data:application/pdf;base64,QQ==');
    expect(log.fileName).toBe('Kaufvertrag.pdf');
    expect(log.comment).toContain('comment: Hausverkauf');
  });

  it('omits the file fields entirely when no document is attached', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.REJECTED, {
      clerk: 'JR',
      requestedLimit: 500000,
    });

    const log = callsTo('kyc/admin/log')[0].data;
    expect(log).not.toHaveProperty('file');
    expect(log).not.toHaveProperty('fileName');
  });

  // The failure contract: stop at the first failing step and report what already landed, so a retry
  // cannot silently raise the limit twice or leave a decision recorded against an unchanged account.
  it('stops and reports when the decision call fails after the limit was raised', async () => {
    mockCall.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Limit request already final'));
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.ACCEPTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      grantedLimit: 500000,
    });

    expect(outcome).toEqual({
      success: false,
      failedStep: 'limitRequest',
      completedSteps: ['depositLimit'],
      message: 'Limit request already final',
    });
    expect(callsTo('support/397328/limit-request-pdf')).toHaveLength(0);
    expect(callsTo('kyc/admin/log')).toHaveLength(0);
  });

  it('does not record a decision when raising the limit fails', async () => {
    mockCall.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.ACCEPTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      grantedLimit: 500000,
    });

    expect(outcome).toMatchObject({ success: false, failedStep: 'depositLimit', completedSteps: [] });
    expect(callsTo('limitRequest/855')).toHaveLength(0);
  });

  it('reports a failed report without undoing the decision', async () => {
    mockCall
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('storage down'));
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.ACCEPTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      grantedLimit: 500000,
    });

    expect(outcome).toMatchObject({
      success: false,
      failedStep: 'report',
      completedSteps: ['depositLimit', 'limitRequest'],
    });
    expect(callsTo('kyc/admin/log')).toHaveLength(0);
  });

  it('reports a failed note last, with everything before it recorded', async () => {
    mockCall
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('log down'));
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.ACCEPTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      grantedLimit: 500000,
    });

    expect(outcome).toMatchObject({
      success: false,
      failedStep: 'log',
      completedSteps: ['depositLimit', 'limitRequest', 'report'],
    });
  });
});
