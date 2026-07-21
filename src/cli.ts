/*

CLI entry point.

The CLI and the HTTP API are two adapters over one domain core. 
Neither contains game logic. This is the observable consequence of the dependency rule.

Accepts command line arguments for the rack, optional board word, and optional policy.
Validates the arguments and invokes the SolverService to compute the best scoring word.
Outputs the result in either human-readable or JSON format.

*/

import { parseArgs } from "node:util";
import { createContainer } from "./composition.js";
import { BOARD_WORD_POLICIES } from "./domain/boardWordPolicy.js";
import { SolverError } from "./domain/errors.js";

const USAGE = `
Scrabble Word Builder — CLI

  npm run cli -- --rack AIDOORW [--word WIZ] [--policy <name>] [--json]

Options:
  -r, --rack     Letters on the player's rack (1-7)          [required]
  -w, --word     A word already on the board                 [optional]
  -p, --policy   ${Object.keys(BOARD_WORD_POLICIES).join(" | ")}
  -j, --json     Emit machine-readable JSON
  -h, --help     Show this message
`;

async function main(): Promise<number> {

    const { values } = parseArgs({
        options: {
        rack: { type: "string", short: "r" },
        word: { type: "string", short: "w" },
        policy: { type: "string", short: "p" },
        json: { type: "boolean", short: "j", default: false },
        help: { type: "boolean", short: "h", default: false },
        },
        strict: true,
    });

    if (values.help || !values.rack) {
        console.log(USAGE);
        return values.help ? 0 : 2;
    }

    const container = await createContainer();

    const policy = values.policy ? BOARD_WORD_POLICIES[values.policy] : undefined;

    if (values.policy && !policy) {
        console.error(`Unknown policy "${values.policy}".`);
        return 2;
    }

    const result = container.solver.solve({
        rack: values.rack,
        ...(values.word ? { boardWord: values.word } : {}),
        ...(policy ? { policy } : {}),
    });

    if (values.json) {
        console.log(JSON.stringify(result, null, 2));
    } else if (result.word === null) {
        console.log("No valid word can be formed from those tiles.");
    } else {
        console.log(`${result.word}  (${result.score} points)`);
        console.log(`  policy:    ${result.policy}`);
        console.log(`  examined:  ${result.candidatesExamined} / ${container.stats.dictionarySize} entries`);
    }
  
    return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    if (error instanceof SolverError) {
      console.error(`Invalid input [${error.code}]: ${error.message}`);
      process.exit(1);
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });