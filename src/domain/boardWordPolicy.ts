/*

Strategy for handling how a board word constrains a play. 

Default is "consumes all board letters" (multiset containment) but we also provide a "contains board word substring" option.
Alternative is stricter and more literal, but rejects legitimate hooks like EARSHOT.

The challenge spec says "a word already on the board that the player may build upon" while also instructing us
to ignore board layout — which admits more than one reading.

We implement both and default to the stricter, more Scrabble-faithful one.

Note: both policies enforce that the candidate word must be longer than the board word, i.e. that at least one tile from the rack is used.
candidate.length <= boardWord.length → false
enforces "you must play at least one tile from your rack" -> build upon what's already on the board as per the spec
Otherwise, WIZ + rack would return WIZ as a valid play.
*/

import { canSupply, type FrequencyVector } from "./alphabet.js";
import type { WordEntry } from "./DictionaryIndex.js";

export interface BoardWordContext {
  readonly boardWord: string;
  readonly boardFreq: FrequencyVector;
}

/**
 * Encodes the (ambiguous) rule for how a board word constrains a play behind one interface.
 * The challenge spec says "a word already on the board that the player may
 * build upon" while also instructing us to ignore board layout — which admits
 * more than one reading. We implement both and default to the stricter,
 * more Scrabble-faithful one.
 */

export interface BoardWordPolicy {
  readonly name: string;
  accepts(candidate: WordEntry, context: BoardWordContext): boolean;
}

/**
 * DEFAULT. 
 * The play must consume every tile of the board word (multiset
 * containment) and add at least one rack tile. Models real Scrabble, where
 * letters can be rearranged or interleaved: RAT + rack SHOE -> EARSHOT.
 */

export const consumesAllBoardLetters: BoardWordPolicy = {
  name: "consumes-all-board-letters",
  accepts(candidate, context) {
    if (candidate.length <= context.boardWord.length) return false;
    return canSupply(candidate.freq, context.boardFreq);
  },
};

/**
 * ALTERNATIVE. 
 * The board word must appear as a contiguous substring.
 * Stricter and more literal, but rejects legitimate hooks like EARSHOT.
 */

export const containsBoardWordSubstring: BoardWordPolicy = {
  name: "contains-board-word-substring",
  accepts(candidate, context) {
    if (candidate.length <= context.boardWord.length) return false;
    return candidate.word.includes(context.boardWord);
  },
};

export const BOARD_WORD_POLICIES = {
  [consumesAllBoardLetters.name]: consumesAllBoardLetters,
  [containsBoardWordSubstring.name]: containsBoardWordSubstring,
} as const;