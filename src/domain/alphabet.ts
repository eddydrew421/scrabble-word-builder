/** 
 A 26-slot histogram of letter counts, indexed A=0… Z=25.
 -Fixed-size arrays are more efficient than maps and allow for easier comparison of letter counts in this context.
 -Comparison is a fixed 26-iteration loop with no key enumeration, no string hashing, no map lookups, no undefined checks.
 */

export const ALPHABET_SIZE = 26;

const CHAR_CODE_A = 65; // 'A'

export type FrequencyVector = Uint8Array;

/** True when `char` is an uppercase A–Z letter. **/
export function isUpperAlpha(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= CHAR_CODE_A && code < CHAR_CODE_A + ALPHABET_SIZE;
}

/** Builds a histogram from an already-uppercased, A–Z-only string. */
export function toFrequencyVector(word: string): FrequencyVector {
  const vector = new Uint8Array(ALPHABET_SIZE);
  for (let i = 0; i < word.length; i++) {
    vector[word.charCodeAt(i) - CHAR_CODE_A]! += 1;
  }
  return vector;
}

/** True when `pool` can supply every letter `need` requires. */
export function canSupply(pool: FrequencyVector, need: FrequencyVector): boolean {
  for (let i = 0; i < ALPHABET_SIZE; i++) {
    if ((need[i] ?? 0) > (pool[i] ?? 0)) return false;
  }
  return true;
}

/** Add the counts from `source` into `target`, mutating `target`. */
export function addInto(target: FrequencyVector, source: FrequencyVector): void {
  for (let i = 0; i < ALPHABET_SIZE; i++) target[i]! += source[i] ?? 0;
}

/** Get the total count of letters in a frequency vector. */
export function totalCount(vector: FrequencyVector): number {
  let sum = 0;
  for (let i = 0; i < ALPHABET_SIZE; i++) sum += vector[i] ?? 0;
  return sum;
}