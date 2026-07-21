import type { NextFunction, Request, Response } from "express";

/**
 * First middleware in the chain. Logs arrival immediately and completion on
 * the response 'finish' event, so a request that never completes is visible
 * as an arrival with no matching completion.
 */

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    
  const startedAt = process.hrtime.bigint();

  console.log(JSON.stringify({
    level: "info", event: "request.start",
    method: req.method, path: req.originalUrl,
    requestId: res.locals.requestId,
  }));

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(JSON.stringify({
      level: "info", event: "request.finish",
      method: req.method, path: req.originalUrl,
      status: res.statusCode, durationMs: Math.round(durationMs * 100) / 100,
      requestId: res.locals.requestId,
    }));
  });

  res.on("close", () => {
    if (!res.writableEnded) {
      console.warn(JSON.stringify({
        level: "warn", event: "request.aborted",
        path: req.originalUrl, requestId: res.locals.requestId,
      }));
    }
  });

  next();
}