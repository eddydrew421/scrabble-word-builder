## Scrabble Word Builder & Scoring Engine

# Intro

You have officially accepted your mission to challenge the world's greatest scrabble players. However, it's late, you're tired, and your brain is working at maybe 30% capacity. This word builder is your crux: helping you choose the best possible English words so that you can take the crown and beat those pesky champions, including your Scrabble master grandmother.

While this tool will help you validate words and make you sound smarter than you are, it is in no case a substitute for the actual brain power required to handle champions at the highest level with a real scrabble board. See Assumptions for more details on limitations based on the assignment requirements and scope.


# Quick Start

This is an app that you will run locally.

(insert Github instructions for cloning)

(insert app start command with Docker)

Quick Start: docker-compose up and a copy-pasteable curl command to test it locally in the terminal.

(insert game instructions)

# API Reference

api reference + curl examples

# Assumptions

This project as submitted assumes the game uses standard English Scrabble tile distributions for letter_data.json; 

Ignore board layout and positioning. The board word contributes its letters to a shared pool, and the answer must consume all of them (we're extending an existing word, not ignoring it). Multiset containment, not substring containment.


## Technical Design Decisions

# Tech Stack

Stack:
Typescript, Node/Express - quick prototyping, type safety, API routing simplified, closest thing to Hasbro Pulse eComm stack.

# Typescript Config

Enabled strict flags vs "strict": true. Gives some of TS's advantages for catching surprises.

noUncheckedIndexedAccess — makes myMap[letter] return T | undefined instead of T.

exactOptionalPropertyTypes — stops { word?: string } from silently accepting { word: undefined }

verbatimModuleSyntax — forces import type for type-only imports, which keeps the compiled output clean and prevents accidental runtime coupling between layers.

# Data Access Patterns

`letter_data.json`

Why this structure:

This is the same idea behind API response envelopes: never return a bare array at the top level, because you can never add metadata later without a breaking change.

A top-level object is extensible; a top-level map is not. If the root were {"A": {...}, "B": {...}}, there'd be nowhere to add distribution or totalTiles without a key collision risk.

I also chose one entry per letter carrying both facts, rather than two parallel objects (scores: {}, tiles: {}). Parallel structures can drift out of sync — one can gain a key the other lacks.

# Scoring

Described in the config based on real scrabble points.

A word's Scrabble score is a pure function of its letters. It never depends on the rack, the board word, or anything at request time. 

So it can be computed once at startup and never again.

Decision: Create an immutable, pre-scored, pre-sorted dictionary. Single pass with early exit, and in practice it terminates within the first few hundred entries because high scorers are rare.

# Algorithmic Approach

Histogram/Frequency Map approach and why it's optimal for scanning a dictionary efficiently.

# Engineering Simplified

Frequency Map / Histogram approach to validate words from the dictionary.

# De-coupling + Separation of concerns

`src/domain`

Nothing in this directory imports. It receives data as arguments and returns values.

DRY principles

Defensive Programming

Never trust user inputs. Having defense guards early in 

# Middleware

Standardized API Response and Error Middleware.

If the input is invalid, return an explicit error object with a 400 status code, not a generic crash screen. A clea

# API 

Best Practices

Versioning

Request/Response

# Services

(to add)

# Types

One of the advantages of using Typescript is for defining data types and contracts, so that there are no surprises at run-time. 

# Architectural Decisions

Explain why TypeScript and Express (type safety, alignment with Hasbro stack, rapid REST routing).

# Trade-offs

Since this is designed to be a lightweight word building engine, some trade-offs were made so that the engine runs lean but has a strong enough foundation to add new features for future improvements.

No point building a DAWG (Directed Acyclic Word Graph) or GADDAG data structures, considered them and rejected because the dataset fits in memory and the measured p99 doesn't justify the complexity.


# Testing

All software needs to be stress-tested so that there are no surprises in production. Included in this project are comprehensive unit testing using Vitest. This covers the main requirements provided where different and most common scenarios are tested in isolation with a pass or fail.  

Table-driven cases, plus property-based tests with fast-check — e.g. "for any valid rack, the returned word is spellable from the pool" and "for any rack, no dictionary word scores higher than the returned word



# Project Structure

scrabble-word-builder/
├── data/
│   ├── dictionary.txt       # Custom valid English words
│   └── letter_data.json     # Letter scores and total game tile counts
├── src/
│   ├── config/              # Constant declarations and file paths
│   ├── middleware/          # Global error handling and validation
│   ├── routes/              # Express route definitions (API v1)
│   ├── services/            # Pure business logic (The Scrabble Solver Engine)
│   ├── types/               # TypeScript interfaces
│   └── app.ts               # Express app initialization
├── tests/                   # Jest unit tests (matching Examples 1-4)
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md                # Startup + Onboarding Guide + Explanations


# DevOps

Github Actions

Multi-stage (build → slim runtime)

# Game Mechanics

Loop through dictionary.txt.

Filter out words that don't meet the length requirement (2–15 characters) or fail canSpellWord.

Calculate the score using your letter_data.json values.

Sort the results: Primarily by Score (Descending), Secondarily by Alphabetical Order (Ascending).

Return the top result.





# Future Improvements


