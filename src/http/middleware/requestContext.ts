/*

Request Middleware

This middleware generates a unique request ID for each incoming request and attaches it to the response headers and the Express response locals. 

This allows for better tracking and correlation of requests in logs and monitoring systems.

*/

import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Locals {
      requestId: string;
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {

  const incoming = req.header("x-request-id");

  const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();

  res.locals.requestId = requestId;

  res.setHeader("x-request-id", requestId);

  next();
}