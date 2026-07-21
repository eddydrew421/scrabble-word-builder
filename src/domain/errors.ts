/*
Error codes for the SolverError class. 

These codes are used to identify specific error conditions that may occur during the solving process.

Why Error taxonomy: 
The error codes are defined as a constant object, and the SolverErrorCode type is derived from the keys of this object. 
This allows for type-safe usage of error codes throughout the codebase and managed from just one place.

Machine-readble error codes are useful for programmatic handling of errors, while human-readable messages provide context for developers and users.
The SolverError class extends the built-in Error class and adds a code property to represent the specific error condition. 
It also accepts an optional details object that can contain additional information about the error.

This design allows for consistent error handling and reporting throughout the application with respect to the word builder engine.

const SolverErrorCode vs enum:
TypeScript enum emits a runtime object and has awkward structural-typing behaviour; 
The const-object pattern gives you the same union type with zero emit and plays properly with verbatimModuleSyntax

*/

export const SolverErrorCode = {
  RACK_EMPTY: "RACK_EMPTY",
  RACK_TOO_LONG: "RACK_TOO_LONG",
  RACK_INVALID_CHARS: "RACK_INVALID_CHARS",
  BOARD_WORD_INVALID_CHARS: "BOARD_WORD_INVALID_CHARS",
  BOARD_WORD_TOO_LONG: "BOARD_WORD_TOO_LONG",
  TILE_LIMIT_EXCEEDED: "TILE_LIMIT_EXCEEDED",
} as const;

export type SolverErrorCode =
  (typeof SolverErrorCode)[keyof typeof SolverErrorCode];

export class SolverError extends Error {
  constructor(
    readonly code: SolverErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "SolverError";
  }
}