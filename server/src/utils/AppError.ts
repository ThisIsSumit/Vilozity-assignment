// Central typed error so the error middleware can map to the right HTTP
// status + structured code without string-sniffing messages.
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Unauthorized") {
    return new AppError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "Forbidden") {
    return new AppError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Resource not found") {
    return new AppError(404, "RESOURCE_NOT_FOUND", message);
  }
  static conflict(message = "Conflict") {
    return new AppError(409, "CONFLICT", message);
  }
  static validation(message = "Invalid request", details?: unknown) {
    return new AppError(422, "VALIDATION_ERROR", message, details);
  }
  static tooMany(message = "Too many requests") {
    return new AppError(429, "TOO_MANY_REQUESTS", message);
  }
  static internal(message = "Internal server error") {
    return new AppError(500, "INTERNAL_ERROR", message);
  }
}
