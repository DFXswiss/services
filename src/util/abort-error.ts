export class AbortError extends Error {
  constructor(
    message?: string,
    readonly code?: number,
  ) {
    super(message);
  }
}
