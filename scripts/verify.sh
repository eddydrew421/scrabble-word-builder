#!/usr/bin/env bash

set -euo pipefail

# ── Definitions (must come before first use — bash has no forward references) ──
BASE="http://127.0.0.1:${PORT:-3001}"
pass() { printf '  ✓ %s\n' "$1"; }
fail() { printf '  ✗ %s\n' "$1"; exit 1; }

check() { # description, expected-status, query-args...
  local desc="$1" expected="$2"; shift 2
  local code
  code=$(curl -s -o /tmp/body.json -w '%{http_code}' -G "$BASE/api/v1/solve" "$@")
  [[ "$code" == "$expected" ]] || fail "$desc (got $code, want $expected)"
  pass "$desc"
}

# ── Preflight: fail loudly, and name the fix ──
echo "── Preflight ──"
command -v npx >/dev/null || { echo "npx not found — install Node >= 20.11.0"; exit 1; }
command -v jq  >/dev/null || { echo "jq not found — 'brew install jq'"; exit 1; }
[[ -d node_modules ]]     || { echo "Dependencies missing — run 'npm ci' first."; exit 1; }
curl -sf "$BASE/health" >/dev/null \
  || fail "no server on $BASE — start one with: PORT=${PORT:-3001} npm run dev"
pass "server reachable on $BASE"

echo "── Static checks ──"
npm run typecheck >/dev/null 2>&1 || fail "typecheck"; pass "typecheck"
npm run build     >/dev/null 2>&1 || fail "build";     pass "build"
npm test          >/dev/null 2>&1 || fail "unit + integration suite"; pass "unit + integration suite"

echo "── Health ──"
curl -sf "$BASE/health" | jq -e '.data.dictionarySize > 100000' >/dev/null \
  || fail "health reports a loaded dictionary"
pass "health reports a loaded dictionary"

echo "── Challenge examples (HTTP) ──"
check "Ex1 AIDOORW+WIZ -> 200" 200 --data-urlencode 'rack=AIDOORW' --data-urlencode 'word=WIZ'
jq -e '.data.word == "WIZARD" and .data.score == 19' /tmp/body.json >/dev/null \
  || fail "  answer is WIZARD (19)"
pass "  answer is WIZARD (19)"

check "Ex2 AIDOORW -> 200" 200 --data-urlencode 'rack=AIDOORW'
jq -e '.data.word == "DRAW" and .data.score == 8' /tmp/body.json >/dev/null \
  || fail "  answer is DRAW (8)"
pass "  answer is DRAW (8)"

check "Ex3 tile limit -> 422" 422 --data-urlencode 'rack=AIDOORZ' --data-urlencode 'word=QUIZ'
jq -e '.error.code == "TILE_LIMIT_EXCEEDED"' /tmp/body.json >/dev/null \
  || fail "  correct code"
pass "  correct code"

check "Ex4 8-letter rack -> 400" 400 --data-urlencode 'rack=AIDOORWZ'

echo "── Edge cases ──"
check "missing rack -> 400"        400
check "empty rack -> 400"          400 --data-urlencode 'rack='
check "digits in rack -> 400"      400 --data-urlencode 'rack=AB3'
check "lowercase accepted -> 200"  200 --data-urlencode 'rack=aidoorw'
check "unknown policy -> 400"      400 --data-urlencode 'rack=RAT' --data-urlencode 'policy=nope'
check "array injection -> 400"     400 --data-urlencode 'rack=AB' --data-urlencode 'rack=CD'
check "no solution -> 200"         200 --data-urlencode 'rack=BB'
jq -e '.data.word == null' /tmp/body.json >/dev/null \
  || fail "  returns word: null"
pass "  returns word: null"

echo "── Policy switching ──"
check "substring policy -> 200" 200 \
  --data-urlencode 'rack=SHOE' --data-urlencode 'word=RAT' \
  --data-urlencode 'policy=contains-board-word-substring'

echo "── Routing ──"
[[ $(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/v2/solve") == 404 ]] \
  || fail "unknown route -> 404"
pass "unknown route -> 404"

curl -s -D- -o /dev/null "$BASE/health" | grep -qi '^x-request-id' \
  || fail "correlation id present"
pass "correlation id present"

echo "── CLI parity ──"
[[ $(npm run --silent cli -- --rack AIDOORW --word WIZ | head -1) == WIZARD* ]] \
  || fail "CLI agrees with API"
pass "CLI agrees with API"

echo; echo "All checks passed."