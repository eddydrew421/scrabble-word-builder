/*

Schema validation for the HTTP API.

Zod validates the transport and parses the query parameters into a strongly-typed object for the domain layer to consume.
vs
SolverService which validates the invariants of the domain objects and enforces the rules of the game.
A domain object must never depend on someone else having validated it.

BOARD_WORD_POLICIES:
Single source of truth, enforced by the type system. Update in one place if the policy names change, and the HTTP API will automatically reflect the change.

*/

import { z } from "zod";
import { RACK_MAX, RACK_MIN, WORD_MAX } from "../domain/SolverService.js";
import { BOARD_WORD_POLICIES } from "../domain/boardWordPolicy.js";

const policyNames = Object.keys(BOARD_WORD_POLICIES) as [string, ...string[]];

export const solveQuerySchema = z.object({
  rack: z
    .string({ message: "rack is required" })
    .trim()
    .min(RACK_MIN, `rack must contain at least ${RACK_MIN} letter`)
    .max(RACK_MAX, `rack must contain no more than ${RACK_MAX} letters`)
    .regex(/^[A-Za-z]+$/, "rack may only contain the letters A–Z"),

  word: z
    .string()
    .trim()
    .max(WORD_MAX, `word must be no longer than ${WORD_MAX} letters`)
    .regex(/^[A-Za-z]*$/, "word may only contain the letters A–Z")
    .optional(),

  policy: z.enum(policyNames).optional(),
});

export type SolveQuery = z.infer<typeof solveQuerySchema>;