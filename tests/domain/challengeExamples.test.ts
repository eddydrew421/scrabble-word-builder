import { beforeAll, describe, expect, it } from "vitest";
import { createContainer, type AppContainer } from "../../src/composition.js";
import { SolverError, SolverErrorCode } from "../../src/domain/errors.js";

/**
 * Verbatim reproduction of the four worked examples in the challenge brief,
 * run against the shipped ENABLE dictionary and standard tile distribution.
 */

describe("Hasbro Pulse challenge — worked examples", () => {

  let container: AppContainer;
  
  beforeAll(async () => { container = await createContainer(); });

  it("Example 1 — rack AIDOORW + board WIZ yields WIZARD (19 points)", () => {
    const result = container.solver.solve({ rack: "AIDOORW", boardWord: "WIZ" });
    expect(result.word).toBe("WIZARD");
    expect(result.score).toBe(19);
  });

  it("Example 2 — rack AIDOORW alone yields DRAW (8 points), first alphabetically", () => {
    const result = container.solver.solve({ rack: "AIDOORW" });
    expect(result.word).toBe("DRAW");
    expect(result.score).toBe(8);
  });

  it("Example 3 — rack AIDOORZ + board QUIZ exceeds the single Z tile", () => {
    expect(() => container.solver.solve({ rack: "AIDOORZ", boardWord: "QUIZ" }))
      .toThrowError(
        expect.objectContaining({ code: SolverErrorCode.TILE_LIMIT_EXCEEDED }),
      );
  });

  it("Example 4 — an 8-letter rack exceeds the 7-tile maximum", () => {
    try {
      container.solver.solve({ rack: "AIDOORWZ" });
      expect.unreachable("expected a SolverError");
    } catch (error) {
      expect(error).toBeInstanceOf(SolverError);
      expect((error as SolverError).code).toBe(SolverErrorCode.RACK_TOO_LONG);
    }
  });
});