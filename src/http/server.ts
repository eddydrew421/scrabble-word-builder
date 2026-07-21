/*

Server entry point. 
Creates the DI container, builds the Express app, and starts listening on the configured port.

Includes graceful shutdown on SIGTERM and SIGINT, with a 10 second timeout before forced exit.
Key for cloud and containerized deployments, where SIGTERM is sent to the process before the container is stopped.

*/

import { createApp } from "./app.js";

import { createContainer } from "../composition.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {

  const container = await createContainer();

  const app = createApp(container);

  const server = app.listen(container.config.port, () => {
    console.log(
      JSON.stringify({
        level: "info",
        message: "Scrabble Word Builder ready",
        port: container.config.port,
        dictionarySize: container.stats.dictionarySize,
        indexBuildMs: container.stats.buildMs,
      }),
    );
  });

  const shutdown = (signal: string): void => {

    console.log(JSON.stringify({ level: "info", message: `${signal} received, draining` }));

    const timer = setTimeout(() => {

      console.error(JSON.stringify({ level: "error", message: "Forced exit" }));

      server.closeAllConnections(); 

      process.exit(1);

    }, SHUTDOWN_TIMEOUT_MS);

    timer.unref(); // don't keep the loop alive just for this timer

    server.close(() => {
      clearTimeout(timer);
      process.exit(0);
    });

    server.closeIdleConnections(); // close idle connections immediately, let active requests finish

  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

//loud fail on startup 
main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: "fatal",
      message: "Startup failed",
      detail: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});