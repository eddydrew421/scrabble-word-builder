/*

Middleware Handler
Ordered from most specific to least specific.  The last two are catch-all handlers.

Single exit point for failure -> don't need a try/catch in every route handler

Known errors disclose only what the client needs to know, and log everything else.
Unknown errors disclose nothing to the client, and log everything.

Detailed internally:
Log detail and return requestId so that the client can report it to us for investigation.

Structured JSON logging
Every log aggregator can parse this and index it for search, filtering, and alerting.
In prod, pino or bunyan would be used instead of console.error, but the principle is the same.
Used console to keep things lightweight and avoid adding dependencies for this exercise.

*/

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { SolverError } from "../../domain/errors.js";
import { AssetLoadError } from "../../infrastructure/assetLoader.js";
import { ERROR_STATUS, type ApiFailure } from "../apiError.js";

export function notFoundHandler(_req: Request, res: Response): void {

  const body: ApiFailure = {
    status: "fail",
    error: { code: "NOT_FOUND", message: "The requested endpoint does not exist." },
  };
  res.status(404).json(body);

}

/** Express identifies error middleware by arity — all four params are required. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {


  // delegate to Express default handler destroy the socket
  if (res.headersSent) return next(err); 

  const requestId = res.locals.requestId;

  if (err instanceof ZodError) {

    const body: ApiFailure = {
      status: "fail",
      error: {
        code: "VALIDATION_FAILED",
        message: "One or more query parameters are invalid.",
        details: err.issues.map((issue) => ({
          field: issue.path.join(".") || "(root)",
          message: issue.message,
        })),
      },
    };

    res.status(ERROR_STATUS.VALIDATION_FAILED ?? 400).json(body);

    return;

  }

  if (err instanceof SolverError) {

    const body: ApiFailure = {
      status: "fail",
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    };

    res.status(ERROR_STATUS[err.code] ?? 400).json(body);

    return;
  }

  // Unknown failure: log everything with structure JSON logging, disclose nothing.
  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      message: err instanceof Error ? err.message : "Non-Error thrown",
      stack: err instanceof Error ? err.stack : undefined,
      isAssetError: err instanceof AssetLoadError,
    }),
  );

  const body: ApiFailure = {
    status: "error",
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      ...(requestId ? { details: { requestId } } : {}),
    },
  };

  res.status(500).json(body);

}