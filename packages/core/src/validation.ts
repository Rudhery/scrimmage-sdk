import type { z } from 'zod';
import { ValidationError } from './errors/index.js';

/**
 * Parse `input` against `schema`, throwing a {@link ValidationError} with
 * field-level issues when validation fails. Keeps zod an internal detail of the
 * core rather than part of its thrown-error contract.
 */
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const issues: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    (issues[key] ??= []).push(issue.message);
  }
  throw new ValidationError('One or more fields are invalid.', issues);
}
