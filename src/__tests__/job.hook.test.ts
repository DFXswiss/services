import { act, renderHook } from '@testing-library/react';
import { JobStatus, JobTicket } from 'src/dto/job.dto';
import { useJobTracker } from '../hooks/job.hook';

const resultPayload = { kycHash: 'hash-1', accessToken: 'token-1' };

function makeTicket(overrides: Partial<JobTicket> = {}): JobTicket {
  return {
    uid: 'J7f3a9c2e1b8d4a60',
    group: 'AccountMerge',
    status: JobStatus.Pending,
    created: new Date().toISOString(),
    expectedSeconds: 65,
    ...overrides,
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('useJobTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should set result on first fetch without ticket', async () => {
    const fetchResult = jest.fn().mockResolvedValue(resultPayload);
    const { result } = renderHook(() => useJobTracker(fetchResult));

    await act(async () => {
      result.current.start();
      await flushMicrotasks();
    });

    expect(result.current.result).toEqual(resultPayload);
    expect(result.current.ticket).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(fetchResult).toHaveBeenCalledTimes(1);
  });

  it('should poll until result after receiving a ticket', async () => {
    const ticket = makeTicket();
    const fetchResult = jest.fn().mockResolvedValueOnce(ticket).mockResolvedValueOnce(resultPayload);
    const { result } = renderHook(() => useJobTracker(fetchResult));

    await act(async () => {
      result.current.start();
      await flushMicrotasks();
    });

    expect(result.current.ticket).toEqual(ticket);
    expect(result.current.result).toBeUndefined();
    expect(fetchResult).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await flushMicrotasks();
    });

    expect(result.current.result).toEqual(resultPayload);
    expect(fetchResult).toHaveBeenCalledTimes(2);
  });

  it('should set error on Failed ticket and stop polling', async () => {
    const ticket = makeTicket({ status: JobStatus.Failed });
    const fetchResult = jest.fn().mockResolvedValue(ticket);
    const { result } = renderHook(() => useJobTracker(fetchResult));

    await act(async () => {
      result.current.start();
      await flushMicrotasks();
    });

    expect(result.current.error).toBe('Job Failed');
    expect(result.current.result).toBeUndefined();
    expect(fetchResult).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(10000);
      await flushMicrotasks();
    });

    expect(fetchResult).toHaveBeenCalledTimes(1);
  });

  it('should retry after a transient error without setting error', async () => {
    const fetchResult = jest
      .fn()
      .mockRejectedValueOnce({ statusCode: 500, message: 'boom' })
      .mockResolvedValueOnce(resultPayload);
    const { result } = renderHook(() => useJobTracker(fetchResult));

    await act(async () => {
      result.current.start();
      await flushMicrotasks();
    });

    expect(result.current.error).toBeUndefined();
    expect(result.current.result).toBeUndefined();
    expect(fetchResult).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await flushMicrotasks();
    });

    expect(result.current.error).toBeUndefined();
    expect(result.current.result).toEqual(resultPayload);
    expect(fetchResult).toHaveBeenCalledTimes(2);
  });
});
