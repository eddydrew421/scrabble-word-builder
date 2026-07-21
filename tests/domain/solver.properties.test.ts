import { fc, test } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import { tinySolver, letterDataFixture, TINY_WORDS } from "../fixtures.js";
import { DictionaryIndex } from "../../src/domain/DictionaryIndex.js";
import { toFrequencyVector, canSupply, addInto, ALPHABET_SIZE }
  from "../../src/domain/alphabet.js";

/** Racks of 1-7 letters drawn from a pool that can't breach tile limits. */
const rackArb = fc
  .stringMatching(/^[A-T]{1,7}$/)
  .filter((s) => s.length >= 1 && s.length <= 7);

describe("SolverService invariants", () => {
  const solver = tinySolver();
  const letterData = letterDataFixture();
  const index = DictionaryIndex.build(TINY_WORDS, letterData);

  test.prop([rackArb])("any returned word is spellable from the rack", (rack) => {
    let result;
    try { result = solver.solve({ rack }); } catch { return true; }
    if (result.word === null) return true;

    const pool = new Uint8Array(ALPHABET_SIZE);
    addInto(pool, toFrequencyVector(rack.toUpperCase()));
    return canSupply(pool, toFrequencyVector(result.word));
  });

  //metamorphic testing
  
  test.prop([rackArb])("no playable word scores higher than the answer", (rack) => {
    let result;
    try { result = solver.solve({ rack }); } catch { return true; }

    const pool = new Uint8Array(ALPHABET_SIZE);
    addInto(pool, toFrequencyVector(rack.toUpperCase()));

    for (const entry of index.entries) {
      if (!canSupply(pool, entry.freq)) continue;
      if (entry.score > result.score) return false;
      // Equal score => the answer must not sort after it.
      if (entry.score === result.score && result.word !== null) {
        if (entry.word < result.word) return false;
      }
    }
    return true;
  });

  

  test.prop([rackArb])("solving is deterministic", (rack) => {
    const run = () => { try { return JSON.stringify(solver.solve({ rack })); }
                        catch (e) { return String(e); } };
    return run() === run();
  });

});