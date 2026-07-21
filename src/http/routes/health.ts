/*
The health route endpoint: reports readiness facts.
Tells the app booted and loaded its data correctly, and is ready to serve requests.
*/

import { Router } from "express";
import type { AppContainer } from "../../composition.js";
import { BOARD_WORD_POLICIES } from "../../domain/boardWordPolicy.js";

export function createHealthRouter(container: AppContainer): Router {

  const router = Router();

  router.get("/health", (_req, res) => {
    res.status(200).json({
      status: "success",
      data: {
        status: "ok",
        uptimeSeconds: Math.round(process.uptime()),
        dictionarySize: container.stats.dictionarySize,
        distribution: container.stats.distribution,
        indexBuildMs: container.stats.buildMs,
        boardWordPolicies: Object.keys(BOARD_WORD_POLICIES),
      },
    });
  });

  return router;
}