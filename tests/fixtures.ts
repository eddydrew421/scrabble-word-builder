import { LetterData, type LetterDataFile } from "../src/domain/letterData.js";
import { DictionaryIndex } from "../src/domain/DictionaryIndex.js";
import { SolverService } from "../src/domain/SolverService.js";

const STANDARD: Record<string, [score: number, tiles: number]> = {
  A: [1, 9], B: [3, 2], C: [3, 2], D: [2, 4], E: [1, 12], F: [4, 2],
  G: [2, 3], H: [4, 2], I: [1, 9], J: [8, 1], K: [5, 1], L: [1, 4],
  M: [3, 2], N: [1, 6], O: [1, 8], P: [3, 2], Q: [10, 1], R: [1, 6],
  S: [1, 4], T: [1, 6], U: [1, 4], V: [4, 2], W: [4, 2], X: [8, 1],
  Y: [4, 2], Z: [10, 1],
};

export function letterDataFixture(): LetterData {

  const file: LetterDataFile = {
    distribution: "test-fixture",
    totalTiles: 98,
    letters: Object.fromEntries(
      Object.entries(STANDARD).map(([k, [score, tiles]]) => [k, { score, tiles }]),
    ),
  };

  return LetterData.fromFile(file);
  
}

/** A deliberately tiny dictionary — every expected answer is hand-verifiable. */
export const TINY_WORDS = [
  "AT", "RAT", "TAR", "ART", "STAR", "RATS", "ARTS", "TARS",
  "CAT", "CATS", "ZA", "ZAS", "EARSHOT", "HOSE", "SHOE", "HOARSE",
];

export function tinySolver(): SolverService {
  const letterData = letterDataFixture();
  return new SolverService(DictionaryIndex.build(TINY_WORDS, letterData), letterData);
}