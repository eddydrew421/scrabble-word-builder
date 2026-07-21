/*
Create App
Returns the app without listening. 
This allows the app to be tested without binding to a port, no async startup, no teardown, no race conditions, no flakiness.

Notes:
health sits outside /api/v1 because it's infrastructure, not an API surface
express.json({ limit: "16kb" }) bounds the size of the request body to prevent abuse. The solver doesn't need more than a few bytes.

*/

import express, { type Express } from "express";
import { requestContext } from "./middleware/requestContext.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createSolveRouter } from "./routes/solve.js";
import { createHealthRouter } from "./routes/health.js";
import type { AppContainer } from "../composition.js";

export function createApp(container: AppContainer): Express {

  const app = express();

  app.disable("x-powered-by"); // don't advertise the stack

  app.set("trust proxy", true); // correct client IPs behind an ALB

  app.use(express.json({ limit: "16kb" }));

  app.use(requestContext);

  app.use(createHealthRouter(container));

  app.use("/api/v1", createSolveRouter(container));

  app.use(notFoundHandler);

  app.use(errorHandler); // must be registered last

  return app;

}