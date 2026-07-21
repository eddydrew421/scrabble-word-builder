/*

Solve Route 

This route handles the solving of Scrabble words based on the provided rack and optional board word.

createSolveRouter(container: AppContainer): Router
Creates an Express router for the /solve endpoint.
This Factory function takes AppContainer and returns a configured Express Router.

Passing the container in keeps the route a pure function of its dependencies. 

The router defines a GET /solve endpoint that accepts query parameters for the rack, optional board word, and optional policy.
It validates the query parameters using Zod and invokes the SolverService to compute the best scoring word.
The response is structured according to the ApiSuccess interface, including the original rack and board word in uppercase.

Notes:
Conditional spread in const result: exactOptionalPropertyTypes (typescript compiler option) forces you to be explicit about a distinction that causes real bugs

No try/catch here — the error handler middleware will catch any exceptions thrown by the route handler
Express 5 forwards errors thrown in handlers — including from schema.parse() — straight to the error middleware. 
Under Express 4 this route would need a wrapper.

*/

import { Router, type Request, type Response } from "express";
import { solveQuerySchema } from "../schema.js";
import { BOARD_WORD_POLICIES } from "../../domain/boardWordPolicy.js";
import type { AppContainer } from "../../composition.js";
import type { ApiSuccess } from "../apiError.js";

export function createSolveRouter(container: AppContainer): Router {

  const router = Router();

  router.get("/solve", (req: Request, res: Response) => {

    // Express 5 practice: req.query is a getter — parse into a local, never mutate.

    const query = solveQuerySchema.parse(req.query);

    const result = container.solver.solve({
      rack: query.rack,
      ...(query.word !== undefined && query.word !== "" ? { boardWord: query.word } : {}),
      ...(query.policy ? { policy: BOARD_WORD_POLICIES[query.policy]! } : {}),
    });

    const body: ApiSuccess<typeof result & { rack: string; boardWord: string | null }> = {
      status: "success",
      data: {
        ...result,
        rack: query.rack.toUpperCase(),
        boardWord: query.word ? query.word.toUpperCase() : null,
      },
    };

    res.status(200).json(body);

  });

  return router;
}