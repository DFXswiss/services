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

describe('useCompliance().fileLimitRequestNote', () => {
  beforeEach(() => {
    mockCall.mockReset().mockResolvedValue(undefined);
  });

  // The way back into a request whose decision is recorded but whose report or note failed, and the way
  // a document arriving after the decision reaches the file. It must never touch the decision itself.
  it('writes only the log entry, anchored to the recorded decision', async () => {
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.fileLimitRequestNote(CONTEXT, {
      clerk: 'JR',
      decision: 'Accepted',
      comment: 'Beleg nachgereicht',
      attachment: { data: 'data:application/pdf;base64,QQ==', name: 'Kaufvertrag.pdf' },
    });

    expect(outcome).toEqual({ success: true, completedSteps: ['log'] });
    expect(mockCall.mock.calls.map(([a]) => `${a.method} ${a.url}`)).toEqual(['POST kyc/admin/log']);

    const log = callsTo('kyc/admin/log')[0].data;
    expect(log.comment).toContain('Services - LimitRequest');
    expect(log.comment).toContain('limitRequest-decision-Accepted');
    expect(log.comment).toContain('comment: Beleg nachgereicht');
    expect(log.fileName).toBe('Kaufvertrag.pdf');
  });

  it('reports a failure without claiming the note was filed', async () => {
    mockCall.mockRejectedValueOnce(new Error('log down'));
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.fileLimitRequestNote(CONTEXT, { clerk: 'JR', decision: 'Rejected' });

    expect(outcome).toMatchObject({ success: false, failedStep: 'log', completedSteps: [] });
  });
});

describe('useCompliance().decideLimitRequest', () => {
  beforeEach(() => {
    mockCall.mockReset().mockResolvedValue(undefined);
  });

  // Report first, then the decision (which raises depositLimit server-side behind the finality check),
  // then the note. The decision is the only step the API refuses to repeat, so anything failing before
  // it leaves the request retryable. Sending grantedDepositLimit on the decision call — rather than a
  // separate userData write — is what closes the race with a second, later-clicking clerk.
  it('files the report, records the accepted grant, then files the note', async () => {
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
      completedSteps: ['report', 'limitRequest', 'log'],
    });

    const urls = mockCall.mock.calls.map(([a]) => `${a.method} ${a.url}`);
    expect(urls).toEqual([
      'POST support/397328/limit-request-pdf',
      'PUT limitRequest/855',
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

    // The depositLimit write now lives inside the decision call — no separate userData PUT.
    expect(callsTo('userData/397328')).toHaveLength(0);

    const decision = callsTo('limitRequest/855')[0].data;
    expect(decision).toMatchObject({
      decision: 'Accepted',
      acceptedLimit: 500000,
      grantedDepositLimit: 500000,
      clerk: 'JR',
    });
    // @IsDate on the API side: the value has to parse as a date, not merely be a string.
    expect(Number.isNaN(Date.parse(decision.edited))).toBe(false);

    const log = callsTo('kyc/admin/log')[0].data;
    expect(log).toMatchObject({ type: 'ManualLog', userData: { id: 397328 } });
    expect(log.comment).toContain('Services - LimitRequest');
    expect(log.comment).toContain('Editor: JR');
    // The KycLogResult still documents the limit change even though the write is inside the decision call.
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

    expect(callsTo('userData/397328')).toHaveLength(0);
    expect(callsTo('limitRequest/855')[0].data).toMatchObject({
      decision: 'PartiallyAccepted',
      acceptedLimit: 200000,
      grantedDepositLimit: 200000,
    });
  });

  // A rejection must not touch the account, and must not write an acceptedLimit or grantedDepositLimit:
  // every view that shows acceptedLimit labels it "Accepted", so a rejected request would read as an
  // accepted amount; the API rejects grantedDepositLimit on a non-granting decision.
  it('leaves the account untouched on a rejection and grants no limit', async () => {
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.REJECTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      currentDepositLimit: 100000,
    });

    expect(outcome.completedSteps).toEqual(['report', 'limitRequest', 'log']);
    // A rejection is filed too: it is exactly the case someone asks about later.
    expect(callsTo('support/397328/limit-request-pdf')[0].data).toMatchObject({
      decision: 'Rejected',
      previousLimit: 100000,
      grantedLimit: undefined,
    });
    expect(callsTo('userData/397328')).toHaveLength(0);
    expect(callsTo('limitRequest/855')[0].data).toMatchObject({ decision: 'Rejected', clerk: 'JR' });
    expect(callsTo('limitRequest/855')[0].data).not.toHaveProperty('acceptedLimit');
    expect(callsTo('limitRequest/855')[0].data).not.toHaveProperty('grantedDepositLimit');
    expect(callsTo('kyc/admin/log')[0].data.comment).not.toContain('depositLimit');
  });

  // Absent rather than null: the API validator rejects a null and keeps the stored value when the field
  // is missing.
  it('omits acceptedLimit entirely on a rejection', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.REJECTED, {
      clerk: 'JR',
      requestedLimit: 500000,
    });

    expect(callsTo('limitRequest/855')[0].data).not.toHaveProperty('acceptedLimit');
    expect(callsTo('limitRequest/855')[0].data).not.toHaveProperty('grantedDepositLimit');
  });

  // Without the amount the decision call would carry nothing to raise and still record an acceptance,
  // and the notification cron would then mail the customer their old limit as if it had been raised.
  it('refuses a granting decision that carries no amount, before touching anything', async () => {
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.ACCEPTED, {
      clerk: 'JR',
      requestedLimit: 500000,
    });

    expect(outcome).toMatchObject({ success: false, failedStep: 'limitRequest', completedSteps: [] });
    expect(outcome.message).toContain('needs the limit it grants');
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('trims the clerk before it reaches the API and the log', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.REJECTED, {
      clerk: '  JR  ',
      requestedLimit: 500000,
    });

    expect(callsTo('limitRequest/855')[0].data.clerk).toBe('JR');
    expect(callsTo('support/397328/limit-request-pdf')[0].data.clerk).toBe('JR');
    expect(callsTo('kyc/admin/log')[0].data.comment).toContain('Editor: JR');
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
  // cannot re-decide a request that is already final or leave a decision recorded against a missing report.
  it('stops and reports when the decision call fails after the report landed', async () => {
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
      completedSteps: ['report'],
      message: 'Limit request already final',
    });
    expect(callsTo('kyc/admin/log')).toHaveLength(0);
  });

  it('does not call the decision endpoint when the report fails', async () => {
    mockCall.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.ACCEPTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      grantedLimit: 500000,
    });

    expect(outcome).toMatchObject({ success: false, failedStep: 'report', completedSteps: [] });
    expect(callsTo('limitRequest/855')).toHaveLength(0);
  });

  // The reason the report goes before the decision: a failing report leaves the request undecided, so
  // the clerk can simply try again once the report endpoint is reachable.
  it('leaves the request undecided when the report fails', async () => {
    mockCall.mockRejectedValueOnce(new Error('storage down'));
    const { result } = renderHook(() => useCompliance());

    const outcome = await result.current.decideLimitRequest(CONTEXT, LimitRequestDecision.ACCEPTED, {
      clerk: 'JR',
      requestedLimit: 500000,
      grantedLimit: 500000,
    });

    expect(outcome).toMatchObject({
      success: false,
      failedStep: 'report',
      completedSteps: [],
    });
    expect(callsTo('limitRequest/855')).toHaveLength(0);
    expect(callsTo('kyc/admin/log')).toHaveLength(0);
  });

  it('reports a failed note last, with everything before it recorded', async () => {
    mockCall
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
      completedSteps: ['report', 'limitRequest'],
    });
  });
});
