import { describe, expect, it } from "vitest";
import { tinySolver } from "../fixtures.js";
import { SolverErrorCode } from "../../src/domain/errors.js";
import {
  consumesAllBoardLetters,
  containsBoardWordSubstring,
} from "../../src/domain/boardWordPolicy.js";

describe("SolverService", () => {
  const solver = tinySolver();

  describe("tie-breaking", () => {
    it("returns the alphabetically first word among equal scores", () => {
      // ART, RAT, TAR all score 3 -> ART wins alphabetically.
      expect(solver.solve({ rack: "RAT" }).word).toBe("ART");
    });
  });

  describe("input normalisation", () => {
    it.each([
      ["lowercase", "rat"],
      ["mixed case", "RaT"],
      ["surrounding whitespace", "  RAT  "],
    ])("accepts %s input", (_label, rack) => {
      expect(solver.solve({ rack }).word).toBe("ART");
    });
  });

  describe("validation", () => {
    it.each([
      ["empty rack", "", SolverErrorCode.RACK_EMPTY],
      ["8-letter rack", "ABCDEFGH", SolverErrorCode.RACK_TOO_LONG],
      ["digits in rack", "AB3", SolverErrorCode.RACK_INVALID_CHARS],
      ["symbols in rack", "A-B", SolverErrorCode.RACK_INVALID_CHARS],
      ["two Zs (one tile exists)", "ZZ", SolverErrorCode.TILE_LIMIT_EXCEEDED],
    ])("rejects %s", (_label, rack, code) => {
      expect(() => solver.solve({ rack })).toThrowError(
        expect.objectContaining({ code }),
      );
    });
  });

  describe("no solution", () => {
    it("returns null rather than throwing when nothing is playable", () => {
      const result = solver.solve({ rack: "BB" });
      expect(result.word).toBeNull();
      expect(result.score).toBe(0);
    });
  });

  describe("board word policies", () => {
    it("default policy permits rearrangement: SHOE + RAT -> EARSHOT (10)", () => {
      const result = solver.solve({
        rack: "SHOE", boardWord: "RAT", policy: consumesAllBoardLetters,
      });
      expect(result.word).toBe("EARSHOT");
      expect(result.score).toBe(10);
    });

    it("substring policy rejects EARSHOT and falls back to RATS (4)", () => {
      // RAT is not contiguous inside EARSHOT, so the substring reading
      // discards the higher-scoring play and settles for a lesser one.
      const result = solver.solve({
        rack: "SHOE", boardWord: "RAT", policy: containsBoardWordSubstring,
      });
      expect(result.word).toBe("RATS");
      expect(result.score).toBe(4);
    });

    it("requires at least one rack tile to be played", () => {
      // Board word ZA is itself in the dictionary but must be extended.
      const result = solver.solve({ rack: "S", boardWord: "ZA" });
      expect(result.word).toBe("ZAS");
    });
  });
});