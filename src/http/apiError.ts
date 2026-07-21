/*

API Error Handling

This module defines the structure of API error responses and maps domain error codes to HTTP status codes.
Domain concerns don't know about HTTP; this table is the translation layer. 

Table vs Conditional in error handler:
Table is the API contract; it is the single source of truth

Distinguishing syntax errors from semantic errors
422 - well formed but semantically invalid (e.g. tile limit exceeded)

400 Bad Request means malformed — I couldn't understand your request. 
422 Unprocessable Content means well-formed but semantically invalid — I understood you perfectly, and what you asked for is illegal. 
rack=AIDOORZ&word=QUIZ is a perfectly well-formed request; it's the Scrabble rules it violates, not HTTP.

Envelope structure:
- status: "success" | "fail" | "error"
- data: present only on success
- error: present only on fail or error
Follows Jsend convention

*/

import { SolverErrorCode } from "../domain/errors.js";

export const ERROR_STATUS: Readonly<Record<string, number>> = {
  [SolverErrorCode.RACK_EMPTY]: 400,
  [SolverErrorCode.RACK_TOO_LONG]: 400,
  [SolverErrorCode.RACK_INVALID_CHARS]: 400,
  [SolverErrorCode.BOARD_WORD_INVALID_CHARS]: 400,
  [SolverErrorCode.BOARD_WORD_TOO_LONG]: 400,
  [SolverErrorCode.TILE_LIMIT_EXCEEDED]: 422, 
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

export interface ApiFailure {
  readonly status: "fail" | "error";
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

export interface ApiSuccess<T> {
  readonly status: "success";
  readonly data: T;
}