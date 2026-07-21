import { readFile } from "node:fs/promises";
import { LetterData, type LetterDataFile } from "../domain/letterData.js";
import { DictionaryIndex } from "../domain/DictionaryIndex.js";

export class AssetLoadError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "AssetLoadError";
  }
}

export async function loadLetterData(filePath: string): Promise<LetterData> {

  let parsed: unknown;

  try {
    parsed = JSON.parse(await readFile(filePath, "utf8"));
  } catch (cause) {
    throw new AssetLoadError(`Unable to read or parse letter data at ${filePath}`, cause);
  }

  const file = parsed as LetterDataFile;

  if (!file?.letters || typeof file.letters !== "object") {
    throw new AssetLoadError(`${filePath} is missing a "letters" object.`);
  }

  const count = Object.keys(file.letters).length;

  if (count !== 26) {
    throw new AssetLoadError(`${filePath} defines ${count} letters; expected 26.`);
  }

  return LetterData.fromFile(file); // performs its own per-letter validation

}

export async function loadDictionaryIndex(
  filePath: string,
  letterData: LetterData,
): Promise<DictionaryIndex> {

  let contents: string;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (cause) {
    throw new AssetLoadError(`Unable to read dictionary at ${filePath}`, cause);
  }

  //Cross-platform line endings: \r\n on Windows, \n on Linux/macOS. Split on either.
  const index = DictionaryIndex.build(contents.split(/\r?\n/), letterData);

  // Backstop: Fail fast if the dictionary is empty
  if (index.size === 0) {
    throw new AssetLoadError(`${filePath} produced zero usable words.`);
  }

  return index;

}