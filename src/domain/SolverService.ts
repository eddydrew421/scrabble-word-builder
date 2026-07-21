/*

SolverService Class

The SolverService is the main entry point for the word building engine.

SolverService takes a DictionaryIndex, a LetterData, and a BoardWordPolicy and exposes a single method, solve(), which takes a rack and an optional board word and returns the best scoring word that can be built.

Design Notes:

Dependency Inversion/ Decoupling: 
The SolverService is designed to be agnostic of the underlying data sources and policies.
Constructor injection, no imports of concrete infrastructure. 
It doesn't read files, doesn't know a config module exists, and doesn't construct its own dependencies. 
Policy detail (which dictionary, which letter data, which board word policy) is injected at construction time = Better Performance

Guard-Clause Ordering: 
Optimization of the guard clauses in the solve() method to minimize expensive operations.
The guard clauses are ordered from cheapest to most expensive.
Same concept as short-circuiting a WHERE clause on the most selective column.

Observability: 
candidatesExamined baked into the response contract. This allows for performance monitoring and debugging without additional instrumentation.

Returning word: null rather than throwing error when no valid word exists.
"No valid word exists" is a legitimate answer to a well-formed question, not an error.

*/

import {
  addInto,
  canSupply,
  toFrequencyVector,
  totalCount,
  ALPHABET_SIZE,
  type FrequencyVector,
} from "./alphabet.js";

import type { DictionaryIndex } from "./DictionaryIndex.js";
import type { LetterData } from "./letterData.js";
import { SolverError, SolverErrorCode } from "./errors.js";

import {
  consumesAllBoardLetters,
  type BoardWordPolicy,
} from "./boardWordPolicy.js";

export interface SolveInput {
  readonly rack: string;
  readonly boardWord?: string;
  readonly policy?: BoardWordPolicy;
}

export interface SolveResult {
  readonly word: string | null;
  readonly score: number;
  readonly policy: string;
  readonly candidatesExamined: number;
}

export const RACK_MIN = 1;
export const RACK_MAX = 7;
export const WORD_MIN = 2;
export const WORD_MAX = 15;

export class SolverService {
  constructor(
    private readonly index: DictionaryIndex,
    private readonly letterData: LetterData,
    private readonly defaultPolicy: BoardWordPolicy = consumesAllBoardLetters,
  ) {}

  solve(input: SolveInput): SolveResult {

    const rack = input.rack.trim().toUpperCase();

    const boardWord = (input.boardWord ?? "").trim().toUpperCase();

    const policy = input.policy ?? this.defaultPolicy;

    this.assertShape(rack, boardWord);

    const rackFreq = toFrequencyVector(rack);

    const boardFreq = toFrequencyVector(boardWord);

    this.assertTileSupply(rackFreq, boardFreq);

    // The pool is every tile the player can legally use.
    const pool = new Uint8Array(ALPHABET_SIZE);

    addInto(pool, rackFreq);

    addInto(pool, boardFreq);

    const poolSize = totalCount(pool);

    const context = { boardWord, boardFreq };

    let examined = 0;

    for (const entry of this.index.entries) {

      examined++;

      // Cheapest rejections first: integer compare before vector compare.
      if (entry.length > poolSize) continue;

      if (!canSupply(pool, entry.freq)) continue;

      if (boardWord && !policy.accepts(entry, context)) continue;

      // Sorted by (score DESC, word ASC) => first match IS the answer.
      return {
        word: entry.word,
        score: entry.score,
        policy: policy.name,
        candidatesExamined: examined,
      };
    }

    return { 
        word: null, 
        score: 0, 
        policy: policy.name, 
        candidatesExamined: examined 
    };

  }

  private assertShape(rack: string, boardWord: string): void {

    if (rack.length < RACK_MIN) {
      throw new SolverError(SolverErrorCode.RACK_EMPTY,
        `The rack must contain at least ${RACK_MIN} letter.`);
    }

    if (rack.length > RACK_MAX) {
      throw new SolverError(SolverErrorCode.RACK_TOO_LONG,
        `The rack contains ${rack.length} letters, exceeding the maximum allowed of ${RACK_MAX}.`,
        { provided: rack.length, maximum: RACK_MAX });
    }

    if (!/^[A-Z]+$/.test(rack)) {
      throw new SolverError(SolverErrorCode.RACK_INVALID_CHARS,
        "The rack may only contain the letters A–Z.");
    }

    if (boardWord) {

      if (!/^[A-Z]+$/.test(boardWord)) {
        throw new SolverError(SolverErrorCode.BOARD_WORD_INVALID_CHARS,
          "The board word may only contain the letters A–Z.");
      }

      if (boardWord.length > WORD_MAX) {
        throw new SolverError(SolverErrorCode.BOARD_WORD_TOO_LONG,
          `The board word exceeds the maximum word length of ${WORD_MAX}.`);
      }

    }

  }

  /** Example 3: one Z tile exists, so rack "…Z" + board "QUIZ" is illegal. */
  private assertTileSupply(rack: FrequencyVector, board: FrequencyVector): void {

    const supply = this.letterData.tileSupply;

    for (let i = 0; i < ALPHABET_SIZE; i++) {

      const used = (rack[i] ?? 0) + (board[i] ?? 0);

      const available = supply[i] ?? 0;

      if (used > available) {

        const letter = String.fromCharCode(65 + i);

        throw new SolverError(SolverErrorCode.TILE_LIMIT_EXCEEDED,
          `Letter "${letter}" is used ${used} times but only ${available} tile(s) exist in the game.`,
          { letter, used, available });

      }

    }
  }

}