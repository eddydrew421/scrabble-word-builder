#!/usr/bin/env bash

set -euo pipefail

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

echo "── Static checks ──"
npm run typecheck >/dev/null || fail "typecheck"; pass "typecheck"
npm run build     >/dev/null || fail "build";     pass "build"
npm test          >/dev/null || fail "unit + integration suite"; pass "unit + integration suite"

echo "── Health ──"
curl -sf "$BASE/health" | jq -e '.data.dictionarySize > 100000' >/dev/null \
  && pass "health reports a loaded dictionary"

echo "── Challenge examples (HTTP) ──"
check "Ex1 AIDOORW+WIZ -> 200" 200 --data-urlencode 'rack=AIDOORW' --data-urlencode 'word=WIZ'
jq -e '.data.word == "WIZARD" and .data.score == 19' /tmp/body.json >/dev/null \
  && pass "  answer is WIZARD (19)"

check "Ex2 AIDOORW -> 200" 200 --data-urlencode 'rack=AIDOORW'
jq -e '.data.word == "DRAW" and .data.score == 8' /tmp/body.json >/dev/null \
  && pass "  answer is DRAW (8)"

check "Ex3 tile limit -> 422" 422 --data-urlencode 'rack=AIDOORZ' --data-urlencode 'word=QUIZ'
jq -e '.error.code == "TILE_LIMIT_EXCEEDED"' /tmp/body.json >/dev/null && pass "  correct code"

check "Ex4 8-letter rack -> 400" 400 --data-urlencode 'rack=AIDOORWZ'

echo "── Edge cases ──"
check "missing rack -> 400"        400
check "empty rack -> 400"          400 --data-urlencode 'rack='
check "digits in rack -> 400"      400 --data-urlencode 'rack=AB3'
check "lowercase accepted -> 200"  200 --data-urlencode 'rack=aidoorw'
check "unknown policy -> 400"      400 --data-urlencode 'rack=RAT' --data-urlencode 'policy=nope'
check "array injection -> 400"     400 --data-urlencode 'rack=AB' --data-urlencode 'rack=CD'
check "no solution -> 200"         200 --data-urlencode 'rack=BB'
jq -e '.data.word == null' /tmp/body.json >/dev/null && pass "  returns word: null"

echo "── Policy switching ──"
check "substring policy -> 200" 200 \
  --data-urlencode 'rack=SHOE' --data-urlencode 'word=RAT' \
  --data-urlencode 'policy=contains-board-word-substring'

echo "── Routing ──"
[[ $(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/v2/solve") == 404 ]] && pass "unknown route -> 404"
[[ -n $(curl -s -D- -o /dev/null "$BASE/health" | grep -i '^x-request-id') ]] && pass "correlation id present"

echo "── CLI parity ──"
[[ $(npm run --silent cli -- --rack AIDOORW --word WIZ | head -1) == WIZARD* ]] \
  && pass "CLI agrees with API"

echo; echo "All checks passed."