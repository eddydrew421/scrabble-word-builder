/*
Composition Root: The composition root is the entry point of the application where all dependencies are composed and wired together. 
It is responsible for creating instances of services, loading configurations, and initializing the application. 
This file serves as the central place to manage the application's dependencies and ensure that everything is properly configured before the application starts running.

Concept: 
Object graphs are constructed in exactly one place, as close to the application entry point as possible

Why:
Manual composition and layering matters.
API entry point and CLI entry point both call createContainer() and both get an identical, fully-wired solver. 
Zero duplicated wiring, zero chance of the CLI and API diverging in behaviour.

Stats: for API /health to report dictionary size, distribution name, build time in ms

*/

import { loadConfig, type AppConfig } from "./config/index.js";
import { loadDictionaryIndex, loadLetterData } from "./infrastructure/assetLoader.js";
import { SolverService } from "./domain/SolverService.js";
import { BOARD_WORD_POLICIES, consumesAllBoardLetters } from "./domain/boardWordPolicy.js";

export interface AppContainer {
  readonly config: AppConfig;
  readonly solver: SolverService;
  readonly stats: {
    readonly dictionarySize: number;
    readonly distribution: string;
    readonly buildMs: number;
  };
}

/**
 * Single place where concrete dependencies are chosen and wired together.
 * Everything downstream receives what it needs; nothing constructs its own.
 */

export async function createContainer(): Promise<AppContainer> {

  const startedAt = performance.now();

  const config = loadConfig();

  const letterData = await loadLetterData(config.letterDataPath);

  const index = await loadDictionaryIndex(config.dictionaryPath, letterData);

  const policy = BOARD_WORD_POLICIES[config.defaultPolicy] ?? consumesAllBoardLetters;

  const solver = new SolverService(index, letterData, policy);

  return {
    config,
    solver,
    stats: {
      dictionarySize: index.size,
      distribution: letterData.distributionName,
      buildMs: Math.round(performance.now() - startedAt),
    },

  };

}