/*
LetterData Class

Private constructor + static factory patterns applied to guarantee that every instance of LetterData is valid and consistent with the letter_data.json file.

Static method: Methods to create a LetterData instance from a LetterDataFile object.
LetterData.fromFile() is the only way in. This guarantees every instance that exists has already passed validation.

*/

import { ALPHABET_SIZE, type FrequencyVector } from "./alphabet.js";

export interface LetterInfo {
  readonly score: number;
  readonly tiles: number;
}

export interface LetterDataFile {
  readonly distribution: string;
  readonly totalTiles: number;
  readonly letters: Readonly<Record<string, LetterInfo>>;
}

/**
 * Denormalised, index-aligned view of letter_data.json.
 * Built once at startup so the hot path never touches a string key.
 */

export class LetterData {
  private constructor(
    readonly scores: Int16Array,          // score per letter index
    readonly tileSupply: FrequencyVector, // tiles available per letter index
    readonly distributionName: string,
  ) {}

  // Factory method to create a LetterData instance from a LetterDataFile object
  // This method processes the letter data and constructs the necessary arrays for scores and tile supply

  static fromFile(file: LetterDataFile): LetterData {

    const scores = new Int16Array(ALPHABET_SIZE);
    const tileSupply = new Uint8Array(ALPHABET_SIZE);

    for (const [letter, info] of Object.entries(file.letters)) {

      const index = letter.toUpperCase().charCodeAt(0) - 65;

      if (index < 0 || index >= ALPHABET_SIZE) {
        throw new Error(`letter_data.json contains a non A–Z key: "${letter}"`);
      }

      scores[index] = info.score;
      tileSupply[index] = info.tiles;

    }
    return new LetterData(scores, tileSupply, file.distribution);
  }

  scoreOf(letterIndex: number): number {
    return this.scores[letterIndex] ?? 0;
  }

}