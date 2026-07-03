/** Base class for every error thrown by the Scrimmage domain. */
export class ScrimmageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A requested entity could not be found. */
export class NotFoundError extends ScrimmageError {}

/** The operation conflicts with the current state (e.g. duplicate name). */
export class ConflictError extends ScrimmageError {}

/** The provided input failed validation. */
export class ValidationError extends ScrimmageError {
  constructor(
    message: string,
    /** Optional field-level issues, keyed by field path. */
    readonly issues?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/** The operation is not allowed for the entity's current state. */
export class InvalidStateError extends ScrimmageError {}
