/*
Boundaries: config, loading, composition, validation
*/

import path from "node:path";

/**
 * src/config/…  and  dist/config/…  are both two levels below the project
 * root, so this resolves identically whether running via tsx or compiled JS.
 */

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: string;
  readonly dictionaryPath: string;
  readonly letterDataPath: string;
  readonly defaultPolicy: string;
}

function intFromEnv(name: string, fallback: number): number {

  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") return fallback;

  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed)) throw new Error(`Environment variable ${name} must be an integer, got "${raw}".`);
  
  return parsed;

}

export function loadConfig(): AppConfig {
  return {
    port: intFromEnv("PORT", 3000),
    nodeEnv: process.env.NODE_ENV ?? "development",
    dictionaryPath:
      process.env.DICTIONARY_PATH ?? path.join(PROJECT_ROOT, "data", "dictionary.txt"),
    letterDataPath:
      process.env.LETTER_DATA_PATH ?? path.join(PROJECT_ROOT, "data", "letter_data.json"),
    defaultPolicy: process.env.BOARD_WORD_POLICY ?? "consumes-all-board-letters",
  };
}