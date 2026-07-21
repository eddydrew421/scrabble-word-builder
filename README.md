# Scrabble Word Builder & Scoring Engine

[![CI](https://github.com/<user>/scrabble-word-builder/actions/workflows/ci.yml/badge.svg)](...)

Finds the highest-scoring valid word playable from a rack of tiles and an
optional word already on the board. Ships as an HTTP API and a CLI over a
single, framework-free domain core.

## Quick Start
   docker compose up --build
   curl -s -G http://localhost:3000/api/v1/solve \
     --data-urlencode 'rack=AIDOORW' --data-urlencode 'word=WIZ' | jq
   # -> WIZARD, 19 points

   # Without Docker
   npm ci && npm run dev
   npm run cli -- --rack AIDOORW --word WIZ

## The Four Challenge Examples        <- table: input | output | HTTP status

## API Reference                      <- params, response envelope, error-code table

## CLI Reference

## Assumptions                        <- ONE board-word rule, stated once

## Design Decisions
   - Board-word ambiguity & the policy strategy

The board word rule. The brief says the board word may be "built upon" while also instructing us to ignore board layout and positioning. That admits two readings: the play must contain the board word as a contiguous substring, or it must consume all of the board word's tiles in any arrangement. I implemented both behind a BoardWordPolicy interface and default to the latter, because real Scrabble permits hooks and interleaving — RAT on the board plus a rack of SHOE legitimately makes EARSHOT, which the substring reading rejects. Both policies reproduce all four worked examples. Switch with ?policy=contains-board-word-substring or the BOARD_WORD_POLICY env var.

   - Pre-sorted dictionary + early exit (with the real measurements)

Honest performance note. A word's score depends only on its letters, so scoring and ordering happen once at startup; the dictionary is stored sorted by (score desc, word asc), which makes the first playable entry the answer — tie-breaking becomes a structural property rather than a runtime step. The gain is real but input-dependent: AIDOORW + WIZ exits after 32,814 of 168,551 entries, while AIDOORW alone scans 154,026 because its best play is only worth 8. Worst case remains O(n). Measured p99 is under 15ms, which is why a DAWG/GADDAG was considered and rejected as unjustified complexity.

   - Frequency vectors over hash maps
   - Two adapters, one domain (the dependency rule)
   - Validate twice: parsing vs. invariants
   - Error taxonomy & why TILE_LIMIT_EXCEEDED is 422
   - Strict TypeScript flags actually enabled

## Testing                            <- examples, table-driven, property-based

## Performance                        <- 168,551 words indexed in ~80ms; p99 <15ms

## Project Structure

## What I'd Do Next