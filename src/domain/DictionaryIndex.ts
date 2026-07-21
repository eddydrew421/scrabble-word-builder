/*

DictionaryIndex Class

Immutable, pre-scored, pre-sorted dictionary.

A word's Scrabble score is a pure function of its letters. 
It never depends on the rack, the board word, or anything at request time. 
So it can be computed once at startup and never again.

Tie Breaker Comparator: Entries are ordered by (score DESC, word ASC), 
which means the FIRST playable entry encountered during a scan is already the correct answer including 
tie-breaking — no result collection, no sort per request.

Once scores are static, sorting by (score DESC, word ASC) is also a build-time operation

Decision:
Why compare strings with < / > as a multi-key comparator vs localeCompare?
localeCompare is locale-dependent and ~10× slower; 
for A–Z ASCII, code-point order is alphabetical order, and determinism matters more

*/

import { ALPHABET_SIZE, toFrequencyVector, type FrequencyVector} from "./alphabet.js";
import type { LetterData } from "./letterData.js";

export interface WordEntry {
  readonly word: string;
  readonly score: number;
  readonly length: number;
  readonly freq: FrequencyVector;
}

export interface DictionaryIndexOptions {
  readonly minLength?: number;
  readonly maxLength?: number;
}

export class DictionaryIndex {

  private constructor(readonly entries: readonly WordEntry[]) {}

  static build(
    words: Iterable<string>,
    letterData: LetterData,
    options: DictionaryIndexOptions = {},
  ): DictionaryIndex {

    const minLength = options.minLength ?? 2;

    const maxLength = options.maxLength ?? 15;

    const entries: WordEntry[] = [];

    for (const raw of words) {

      const word = raw.trim().toUpperCase();

      if (word.length < minLength || word.length > maxLength) continue;

      if (!/^[A-Z]+$/.test(word)) continue;

      const freq = toFrequencyVector(word);

      let score = 0;

      for (let i = 0; i < ALPHABET_SIZE; i++) {

        score += (freq[i] ?? 0) * letterData.scoreOf(i);

      }

      entries.push({ word, score, length: word.length, freq });

    }

    // tie-break comparator
    entries.sort((a, b) =>
      b.score - a.score || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0),
    );

    return new DictionaryIndex(entries);
  }

  get size(): number {
    return this.entries.length;
  }
}