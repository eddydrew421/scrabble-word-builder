# Scrabble Word Builder & Scoring Engine

[![CI](https://github.com/eddydrew421/scrabble-word-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/eddydrew421/scrabble-word-builder/actions/workflows/ci.yml)

Finds the highest-scoring valid word playable from a rack of tiles and an optional word already on the board. Ships as an HTTP API and a CLI over a single, framework-free domain core.

Mission Brief:
> You've accepted your mission to challenge the world's greatest Scrabble players. It's late, your brain is at 30% capacity, and your grandmother is merciless. This is your crutch — but it is not a substitute for actually being good at Scrabble. See [Assumptions](#assumptions) for what it deliberately does not model.

---

## Quick Start

**With Docker (recommended — one command, no local Node required):**

```bash
docker compose up --build -d

curl -s -G http://localhost:3000/api/v1/solve \
  --data-urlencode 'rack=AIDOORW' --data-urlencode 'word=WIZ' | jq
# -> WIZARD, 19 points
```

**Without Docker** (requires Node >= 20.11.0):

```bash
npm ci
npm run dev                                    # API on http://localhost:3000
npm run cli -- --rack AIDOORW --word WIZ       # CLI
npm test                                       # full test suite
```

> **Shell note:** always single-quote or use `curl -G --data-urlencode` for query strings. In zsh, an unquoted `&` backgrounds the command and `?` is treated as a glob.

---

## The Four Challenge Examples

Every example from the brief is reproduced as an executable test in
[`tests/domain/challengeExamples.test.ts`](tests/domain/challengeExamples.test.ts), run against the shipped dictionary and tile distribution.

| # | rack | word | Result | HTTP | Notes |
|---|------|------|--------|------|-------|
| 1 | `AIDOORW` | `WIZ` | `WIZARD` (19) | 200 | Board word's tiles are consumed by the play |
| 2 | `AIDOORW` | — | `DRAW` (8) | 200 | Ties with `WADI, WARD, WOAD, WOOD, WORD`; alphabetically first wins |
| 3 | `AIDOORZ` | `QUIZ` | `TILE_LIMIT_EXCEEDED` | 422 | Only one `Z` tile exists in the game |
| 4 | `AIDOORWZ` | any | `RACK_TOO_LONG` | 400 | Rack exceeds 7 tiles |

Verify them all against a running instance:

```bash
PORT=3000 npm run verify
```

---

## API Reference

### `GET /api/v1/solve`

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `rack` | string | yes | 1–7 letters, `A–Z`, case-insensitive |
| `word` | string | no | 0–15 letters, `A–Z`, case-insensitive |
| `policy` | enum | no | `consumes-all-board-letters` (default) or `contains-board-word-substring` |

**Success — `200 OK`**

```json
{
  "status": "success",
  "data": {
    "word": "WIZARD",
    "score": 19,
    "policy": "consumes-all-board-letters",
    "candidatesExamined": 32814,
    "rack": "AIDOORW",
    "boardWord": "WIZ"
  }
}
```

`word` is `null` with `score: 0` when no legal play exists. **This is a 200, not a 404** — "no valid word exists" is a correct answer to a well-formed question, not a client error. Forcing clients into `try/catch` for normal control flow is an API design mistake.

`candidatesExamined` reports how many dictionary entries were scanned before the answer was found. It exists to make the early-exit optimisation observable from the outside rather than only visible in the source.

**Failure — JSend `fail`/`error` envelope**

```json
{
  "status": "fail",
  "error": {
    "code": "TILE_LIMIT_EXCEEDED",
    "message": "Letter \"Z\" is used 2 times but only 1 tile(s) exist in the game.",
    "details": { "letter": "Z", "used": 2, "available": 1 }
  }
}
```

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_FAILED` | 400 | Query parameters malformed, missing, or repeated |
| `RACK_EMPTY` | 400 | Rack has no letters |
| `RACK_TOO_LONG` | 400 | Rack exceeds 7 tiles |
| `RACK_INVALID_CHARS` | 400 | Rack contains non `A–Z` characters |
| `BOARD_WORD_INVALID_CHARS` | 400 | Board word contains non `A–Z` characters |
| `BOARD_WORD_TOO_LONG` | 400 | Board word exceeds 15 letters |
| `TILE_LIMIT_EXCEEDED` | 422 | Well-formed request, but the play violates tile supply |
| `NOT_FOUND` | 404 | Unknown endpoint |
| `INTERNAL_ERROR` | 500 | Unexpected failure; response carries a `requestId` for correlation |

Clients should switch on `code`, which is a stable contract. `message` is human-facing prose and may be re-worded.

### `GET /health`

Reports readiness facts, not just liveness — dictionary size, distribution name, index build time, uptime, and the available board-word policies. A load balancer and a human debugging a bad deploy consume the same endpoint.

### Correlation IDs

Every response carries `x-request-id`. An inbound header is honoured (bounded to 128 chars) so an upstream service's trace ID flows through; otherwise one is minted. Request start and finish are both logged as structured JSON, which means a request that never completes appears as an unmatched `request.start` — the signature of a hang.

---

## CLI Reference

```bash
npm run cli -- --rack AIDOORW --word WIZ
npm run cli -- --rack AIDOORW --json
npm run cli -- --rack SHOE --word RAT --policy contains-board-word-substring
npm run cli -- --help
```

| Flag | Short | Description |
|------|-------|-------------|
| `--rack` | `-r` | Letters on the player's rack (required) |
| `--word` | `-w` | A word already on the board |
| `--policy` | `-p` | Board-word rule to apply |
| `--json` | `-j` | Machine-readable output |
| `--help` | `-h` | Usage |

Exit codes follow POSIX convention: `0` success, `1` invalid input or runtime failure, `2` usage error — so the CLI composes correctly in a shell pipeline.

**The CLI contains zero game logic.** It and the HTTP API are two adapters over one domain core, both constructed from the same composition root. 

Identical inputs produce identical answers by construction, not by discipline. `scripts/verify.sh` asserts this as its final check.

---

## Assumptions

### 1. Standard English tile distribution

`data/letter_data.json` uses the standard English Scrabble distribution: 98 lettered tiles across 26 letters. Blank tiles are excluded per the brief.

### 2. Dictionary provenance

`data/dictionary.txt` is derived from **ENABLE** (Enhanced North American Benchmark Lexicon), which is public domain. Filtered to A–Z only and 2–15 letters, yielding **168,551 words**.

This was a deliberate licensing decision. The official Scrabble word lists (TWL, SOWPODS) are copyrighted by Hasbro and Merriam-Webster — shipping a scraped copy of them *to Hasbro* would be the wrong choice regardless of how convenient it was.

Both worked examples in the brief reproduce exactly against ENABLE, which is what made it safe to ship a full-size lexicon rather than a curated one.

### 3. What "building upon" a board word means — the central ambiguity

**The brief is ambiguous here, and this is the most consequential decision in the project.**

It describes the board word as one the player "may build upon," while simultaneously instructing us to ignore board layout and positioning. 

Those two statements admit two incompatible readings:

| Reading | Rule | Consequence |
|---------|------|-------------|
| **Substring** | The play must contain the board word as a contiguous substring | Literal, but rejects legitimate Scrabble plays |
| **Multiset** *(default)* | The play must consume every tile of the board word, in any arrangement, plus at least one rack tile | Models how Scrabble actually works |

Rather than silently pick one, both are implemented behind a `BoardWordPolicy` interface. The default is the multiset reading, because real Scrabble permits hooks and rearrangement.

**The concrete case that decides it** — board `RAT`, rack `SHOE`:

- Multiset reading → **`EARSHOT`, 10 points**
- Substring reading → **`RATS`, 4 points** (`RAT` is not contiguous inside `EARSHOT`, so the higher play is discarded)

Both readings reproduce all four worked examples in the brief, so the examples themselves do not disambiguate. The 10-vs-4 gap is why the multiset reading is the default. Both are covered by tests in `tests/domain/solver.test.ts`.

Switch at runtime with `?policy=contains-board-word-substring` or the `BOARD_WORD_POLICY` environment variable.

### 4. Other simplifications, per the brief

Blank tiles, bonus squares, board geometry, and turn order are all out of scope. 

Words are validated by dictionary membership and tile availability only.

---

## Design Decisions

### Two adapters, one domain

```
   HTTP adapter  ─┐
                  ├─→  composition root  ─→  domain core (pure)
   CLI adapter   ─┘                              ↑
                                          infrastructure (fs)
```

This was done on purpose. Hexagonal architecture connecting via ports is something that I use in my own and client production apps.

Nothing in `src/domain/` imports Express, `fs`, `path`, `process`, or config. It receives data as arguments and returns values. That single constraint is what makes the domain testable in microseconds, reusable by both entry points, and free of framework lock-in.

`src/infrastructure/assetLoader.ts` is the **only file in the project that knows `fs` exists**. 

`DictionaryIndex.build()` accepts an `Iterable<string>`, not a path — so it can be fed a file, a 16-word array in a test, or a database cursor later. 

The domain depends on an abstraction; infrastructure supplies the concretion.

### Composition root, not a DI framework

`src/composition.ts` is the single place where concrete dependencies are chosen and wired. Everywhere else, dependencies arrive via constructor or factory parameter.

This was chosen over `inversify` / `tsyringe` deliberately. At this size a container library adds indirection without removing work. Manual composition is explicit, greppable, and has no runtime reflection.

### Frequency vectors over hash maps

Letter counts are represented as a fixed 26-slot `Uint8Array` rather than a `Record<string, number>`.

- **No allocation churn.** 26 contiguous bytes vs. hash buckets and pointer chasing — across 168,551 words, that difference is the entire performance story.
- **No `undefined` branch.** A dense vector has no absent keys, only zeroes. The alternative forces every check to test for absence *and* exhaustion — two failure modes for one concept.
- **Comparison is a fixed 26-iteration loop** with no key enumeration or string hashing.

The underlying insight: the problem is not "letters in a string," it is "a multiset over a 26-symbol alphabet." Naming that concept and giving it a real representation is the difference between an implementation and a model.

### Pre-sorted dictionary and early exit

**A word's Scrabble score is a pure function of its letters.** 

It never depends on the rack, the board word, or anything known only at request time. Therefore it can be computed once, at startup, and never again.

Once scores are static, ordering by `(score DESC, word ASC)` is also a startup operation. And once the index is sorted that way, **the alphabetical tie-breaking requirement stops being a feature to implement** — it becomes a structural property of the data. 

There is no per-request candidate collection, no result array, no sort. The first playable entry encountered *is* the answer.

Guard clauses are ordered cheapest-first: an integer length comparison rejects most of the dictionary, then the 26-slot vector comparison, and only then the board-word policy.

### Validation happens twice, on purpose

Zod validates at the HTTP boundary; `SolverService` validates domain invariants. These are different jobs, not duplication:

- **Zod parses the transport.** Is `rack` present? Is it a string at all — `?rack=A&rack=B` arrives as an *array*, which would crash `.trim()` deep inside the domain with a confusing `TypeError`. Is `policy` a name that exists? This turns `unknown` into a typed value. There is a test for the array case.

- **The domain enforces the rules of Scrabble.** Rack ≤ 7 tiles, tile supply not exceeded. These must hold for *every* caller — the API, the CLI, a future gRPC adapter, a unit test.

The principle: **a domain object must never depend on someone else having validated it.**

Duplication of *checks* at boundaries is correct; duplication of *rules* is not, and the rules live in exactly one place.

### Error taxonomy, and why `TILE_LIMIT_EXCEEDED` is 422

Errors carry a machine-readable `code` alongside human prose, and a single table maps code → HTTP status. The table *is* the contract, in one screen, greppable — adding a code without a status becomes a visible omission rather than a silent fallthrough to 500.

`400 Bad Request` means *malformed* — the request could not be understood. `422 Unprocessable Content` means *well-formed but semantically invalid*. `rack=AIDOORZ&word=QUIZ` is a perfectly well-formed HTTP request; what it violates is the rules of Scrabble, not the rules of HTTP.

Reasonable engineers flatten both to 400 for client simplicity. The `code` field is what clients should switch on either way; the status distinction exists for operators, where separating malformed traffic from rule violations is diagnostically useful on a dashboard.

### Known errors disclose, unknown errors do not

A `SolverError` carries a message written deliberately for a user and is returned verbatim. 

An unexpected exception may carry a file path, a stack trace, or a dependency's internals — so it is logged in full as structured JSON and the client receives only `INTERNAL_ERROR` plus the `requestId`. Detailed internally, opaque externally.

The error handler also guards `res.headersSent`, delegating to Express when a response has already begun streaming. You cannot change a status code that has already been written, and attempting to throws a second error inside the error handler.

### Strict TypeScript flags, chosen individually

`"strict": true` is table stakes. These were enabled on top of it, each for a reason:

- **`noUncheckedIndexedAccess`** — makes `map[key]` return `T | undefined`. This is the flag that catches the classic frequency-map bug where an absent key is assumed present.
- **`exactOptionalPropertyTypes`** — distinguishes "property absent" from "property present but `undefined`". Directly relevant here, since `word` is optional; it is why the route uses conditional spread rather than passing `undefined`.
- **`verbatimModuleSyntax`** — forces `import type` for type-only imports, keeping compiled output clean and preventing accidental runtime coupling between layers.

### Container and process lifecycle

- **Three-stage Docker build.** Build stage needs TypeScript; a separate `deps` stage installs production-only modules; the runtime copies from both. No build tooling ships. Layers are ordered least- to most-frequently-changed, so a source edit reuses the cached `npm ci`.

- **`npm ci`, not `npm install`.** Installs exactly the lockfile, fails on drift, never mutates it. Reproducible builds require it.

- **Non-root.** Runs as the `node` user (uid 1000). Verify with `docker compose exec api whoami`.

- **`HEALTHCHECK`** uses Node's built-in `fetch` — no extra package or layer — and exercises the same readiness facts a load balancer would.

- **Graceful shutdown.** `SIGTERM`/`SIGINT` trigger `closeIdleConnections()` immediately (idle keep-alive sockets have no work to lose), then `server.close()` to drain in-flight requests, with `closeAllConnections()` as a 10s backstop. Handlers are idempotent, because orchestrators genuinely send repeat signals. Node as PID 1 receives no default signal handlers, so these explicit ones are what make container replacement clean.

- **Explicit `0.0.0.0` bind and an `EADDRINUSE` handler.** Both added after a real incident during development — see below.

### A bug worth documenting

During development, every HTTP request hung indefinitely — connection accepted, no response, no logs. The application was fine: the integration suite exercised the entire middleware stack in 158ms and passed 7/7. The cause was an orphaned process still owning port 3000; the kernel completed the TCP handshake and queued connections that nobody was accepting.

Three changes came out of it: an `EADDRINUSE` handler so the failure is now loud and immediate, paired `request.start`/`request.finish` logging so an incomplete request is visible as an unmatched pair, and an explicit bind address so behaviour does not depend on the host's dual-stack configuration.

The architectural point: **layering did not prevent the bug, but it localised it.** 

Because `createApp()` is separable from `server.ts`, the entire HTTP stack could be proven correct in one command, reducing the search space to the process lifecycle. 

Testability is not a side benefit of the dependency rule — it is the mechanism by which faults get isolated.

---

## Testing

```bash
npm test              # full suite
npm run test:watch
npm run typecheck     # includes tests/ via tsconfig.test.json
npm run verify        # end-to-end: static checks + live HTTP + CLI parity
```

Four layers, each doing a different job:

**1. Challenge examples** (`tests/domain/challengeExamples.test.ts`) — the four worked examples from the brief, verbatim, named after them, run against the shipped dictionary. Assertions target `error.code`, never message prose, so rewording a message never breaks a test.

**2. Table-driven behaviour** (`tests/domain/solver.test.ts`) — tie-breaking, case and whitespace normalisation, every validation failure mode, the no-solution path, and both board-word policies. Run against a **16-word fixture dictionary** whose expected answers are hand-verifiable. With 168,551 words you cannot tell whether a red test means broken code or an obscure word legitimately winning; a test you cannot reason about is a test that gets deleted when it goes red.

**3. Property-based tests** (`tests/domain/solver.properties.test.ts`) — fast-check generates arbitrary racks and hunts for counterexamples to three invariants:

- Any returned word is spellable from the pool.
- **No playable word scores higher than the answer** — this re-derives the correct result by brute force and asserts the optimised solver agrees. That is metamorphic testing: validating a fast implementation against an obviously-correct slow one, which is precisely the risk taken on by pre-sorting and exiting early.
- Solving is deterministic, encoding the tie-break guarantee as a universal law rather than a single example.

**4. HTTP integration** (`tests/http/api.test.ts`) — supertest against `createApp()` with no port binding: envelope shape, status codes, the array-injection case, correlation-ID echo, and 404 routing.

`scripts/verify.sh` runs static checks, then every example and edge case over live HTTP, and finishes by asserting the CLI and API agree. That last check is the empirical proof of the dependency rule — if it ever fails, logic has leaked into an adapter.

CI runs typecheck, tests, and build on Node 20.x and 22.x, then **builds the Docker image, starts it, polls `/health`, and asserts the real answer**. Anyone can run `npm test` in CI; proving the deployed artifact works is the part that matters.

---

## Performance

Measured on the shipped dictionary (168,551 words), Node 20, Apple Silicon:

| Metric | Value |
|--------|-------|
| Index build (startup, one-time) | ~80–130 ms |
| `AIDOORW` + `WIZ` → `WIZARD` | 7.4 ms, 32,814 entries examined |
| `AIDOORW` → `DRAW` | 13.6 ms, 154,026 entries examined |
| Validation rejection | < 1 ms |
| Container image | 209 MB |

**An honest note on the optimisation.** 

Pre-sorting moves scoring and tie-breaking to startup and enables early exit, but the gain is input-dependent and not guaranteed. A high-scoring answer is found near the top of the index; when the best available play is worth only 8 points, the scan runs nearly to the end. Worst case remains O(n).

The win is still real — per-request scoring, allocation, and sorting are eliminated entirely — but the numbers above are reported as measured rather than as a best case.

Measured p99 is under 15 ms, which is why a DAWG or GADDAG was **considered and rejected upon researching**. 

At 10× the dictionary the frequency vectors would still fit comfortably in memory; the first move would be bucketing by maximum achievable score to skip whole ranges, and only then a specialised structure — after measuring.

---

## Project Structure

```
scrabble-word-builder/
├── .github/workflows/ci.yml       # typecheck, test, build, Docker smoke test
├── data/
│   ├── dictionary.txt             # ENABLE, filtered to A–Z and 2–15 letters
│   └── letter_data.json           # Letter scores and tile counts
├── scripts/verify.sh              # End-to-end verification harness
├── src/
│   ├── domain/                    # Pure business logic — imports nothing outward
│   │   ├── alphabet.ts            # Frequency vectors over a 26-symbol alphabet
│   │   ├── letterData.ts          # Index-aligned view of letter_data.json
│   │   ├── DictionaryIndex.ts     # Immutable, pre-scored, pre-sorted lexicon
│   │   ├── boardWordPolicy.ts     # Strategy: the two readings of the brief
│   │   ├── SolverService.ts       # The engine
│   │   └── errors.ts              # Error taxonomy
│   ├── infrastructure/
│   │   └── assetLoader.ts         # The only file that knows `fs` exists
│   ├── http/
│   │   ├── app.ts                 # Express wiring (constructs, does not listen)
│   │   ├── server.ts              # Listens; lifecycle and graceful shutdown
│   │   ├── schemas.ts             # Zod transport validation
│   │   ├── apiError.ts            # code → HTTP status table, JSend envelopes
│   │   ├── routes/                # health, solve
│   │   └── middleware/            # requestContext, requestLogger, errorHandler
│   ├── config/index.ts            # Environment reading, fails fast on bad input
│   ├── composition.ts             # Composition root — the only wiring point
│   └── cli.ts                     # Second adapter over the same domain
├── tests/
├── Dockerfile                     # Three-stage, non-root
├── compose.yml
├── tsconfig.json                  # Build config (rootDir: src)
├── tsconfig.test.json             # Typecheck config (includes tests/)
└── vitest.config.ts
```

---

## What I Deliberately Did Not Build

Complexity that was considered and rejected is as much a design decision as complexity that was added:

| Not built | Why |
|-----------|-----|
| DAWG / GADDAG | Measured p99 under 15 ms; the dataset fits in memory. Not justified. |
| DI container (`inversify`, `tsyringe`) | Manual composition is explicit and greppable at this size. |
| `pino` structured logger | `console` with JSON payloads keeps dependencies minimal. Production answer would be `pino`. |
| Caching / persistence layer | Stateless by design; the index is the cache. |
| Rate limiting, auth | No threat model in the brief; would be added at the gateway, not in-process. |
| OpenAPI spec | The highest-value next addition — see below — but not required to demonstrate the design. |
| Blank tiles, bonus squares, board geometry | Explicitly out of scope per the brief. |

---

## What I'd Do Next

1. **OpenAPI 3.1 spec generated from the Zod schemas**, with a typed client. For a team consuming this service, a machine-readable contract matters more than anything else on this list.
2. **Share the index across workers.** Each process currently builds its own; under clustering, a pre-built binary index loaded via `mmap` or a shared cache would cut cold-start cost in prod.
3. **`pino` with log levels and sampling**, plus OpenTelemetry traces propagated from the existing `x-request-id`.
4. **Distroless base image** (~110 MB vs 209 MB), accepting the loss of shell access inside the container for a more lightweight project.
5. **A third policy** modelling actual board geometry, which the current `BoardWordPolicy` interface already accommodates without touching the solver.
