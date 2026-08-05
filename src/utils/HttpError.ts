export class HttpError extends Error {
  public readonly status: number;
  public readonly errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, HttpError);
  }
}
