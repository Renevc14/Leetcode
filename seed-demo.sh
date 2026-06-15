#!/bin/bash
# Seed completo de datos demo: problemas, contests, categorias.
# Requiere JWT_ADMIN en /tmp/jwt_admin_real.txt (test-admin generado por Authentik).

set -e
JWT=$(cat /tmp/jwt_admin_real.txt)
PROBLEMS=http://localhost:3001
CONTESTS=http://localhost:3004

# --- Categorias (idempotente) ---
echo "[seed] categorias..."
docker exec -i problems-postgres psql -U problems -d problems <<'SQL' >/dev/null
INSERT INTO categories (id, name) VALUES
  (gen_random_uuid(), 'math'),
  (gen_random_uuid(), 'array'),
  (gen_random_uuid(), 'hash-map'),
  (gen_random_uuid(), 'string'),
  (gen_random_uuid(), 'dp'),
  (gen_random_uuid(), 'sorting'),
  (gen_random_uuid(), 'graph'),
  (gen_random_uuid(), 'binary-search'),
  (gen_random_uuid(), 'two-pointers'),
  (gen_random_uuid(), 'greedy')
ON CONFLICT (name) DO NOTHING;
SQL

# --- Problemas ---
create_problem() {
  local SLUG="$1" TITLE="$2" DIFF="$3" DESC="$4" CATS="$5" LANGS="$6" TIME_MS="$7" MEM_MB="$8" TCS="$9"
  curl -s -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
    -d "{\"slug\":\"$SLUG\",\"title\":\"$TITLE\",\"descriptionMd\":\"$DESC\",\"constraintsMd\":\"1<=n<=10^5\",\"difficulty\":\"$DIFF\",\"categories\":$CATS,\"timeLimitMs\":$TIME_MS,\"memoryLimitMb\":$MEM_MB,\"allowedLanguages\":$LANGS,\"testCases\":$TCS}" \
    "$PROBLEMS/v1/problems" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or d)"
}

echo "[seed] problemas..."

PB1=$(create_problem "sum-two" "Sum Two" "EASY" \
  "Read two integers a and b. Print their sum." \
  '["math"]' '["PYTHON","JAVASCRIPT","CPP"]' 1000 128 \
  '[{"input":"2 3","expectedOutput":"5","isSample":true,"explanation":"basic"},{"input":"10 20","expectedOutput":"30","isSample":false,"explanation":""},{"input":"-5 7","expectedOutput":"2","isSample":false,"explanation":""}]')
echo "  sum-two: $PB1"

PB2=$(create_problem "reverse-string" "Reverse String" "EASY" \
  "Read a string and print it reversed." \
  '["string"]' '["PYTHON","JAVASCRIPT"]' 1000 128 \
  '[{"input":"hello","expectedOutput":"olleh","isSample":true,"explanation":"reverse"},{"input":"abc","expectedOutput":"cba","isSample":false,"explanation":""}]')
echo "  reverse-string: $PB2"

PB3=$(create_problem "max-of-array" "Max of Array" "EASY" \
  "Line 1: integer n. Line 2: n integers. Print the maximum." \
  '["array"]' '["PYTHON","JAVASCRIPT","CPP"]' 1000 128 \
  '[{"input":"5\n3 1 4 1 5","expectedOutput":"5","isSample":true,"explanation":"max"},{"input":"3\n-1 -5 -2","expectedOutput":"-1","isSample":false,"explanation":""}]')
echo "  max-of-array: $PB3"

PB4=$(create_problem "two-sum" "Two Sum" "MEDIUM" \
  "Line 1: n target. Line 2: n integers. Print indices (0-based) of two numbers that sum to target." \
  '["array","hash-map"]' '["PYTHON","JAVASCRIPT"]' 2000 256 \
  '[{"input":"4 9\n2 7 11 15","expectedOutput":"0 1","isSample":true,"explanation":"basic"},{"input":"3 6\n3 2 4","expectedOutput":"1 2","isSample":false,"explanation":""}]')
echo "  two-sum: $PB4"

PB5=$(create_problem "fibonacci" "Fibonacci" "MEDIUM" \
  "Read n. Print the n-th Fibonacci number (F(0)=0, F(1)=1)." \
  '["dp","math"]' '["PYTHON","JAVASCRIPT","CPP"]' 1000 128 \
  '[{"input":"10","expectedOutput":"55","isSample":true,"explanation":"fib(10)"},{"input":"0","expectedOutput":"0","isSample":false,"explanation":""},{"input":"15","expectedOutput":"610","isSample":false,"explanation":""}]')
echo "  fibonacci: $PB5"

PB6=$(create_problem "palindrome-check" "Palindrome Check" "EASY" \
  "Read a string. Print YES if it is a palindrome, NO otherwise." \
  '["string","two-pointers"]' '["PYTHON","JAVASCRIPT"]' 1000 128 \
  '[{"input":"radar","expectedOutput":"YES","isSample":true,"explanation":"palindrome"},{"input":"hello","expectedOutput":"NO","isSample":false,"explanation":""}]')
echo "  palindrome-check: $PB6"

PB7=$(create_problem "sort-array" "Sort Array" "EASY" \
  "Line 1: n. Line 2: n integers. Print them sorted ascending, space-separated." \
  '["sorting","array"]' '["PYTHON","JAVASCRIPT"]' 2000 256 \
  '[{"input":"5\n3 1 4 1 5","expectedOutput":"1 1 3 4 5","isSample":true,"explanation":"sort"},{"input":"3\n9 2 7","expectedOutput":"2 7 9","isSample":false,"explanation":""}]')
echo "  sort-array: $PB7"

PB8=$(create_problem "longest-substring" "Longest Substring" "HARD" \
  "Read a string. Print the length of the longest substring without repeating characters." \
  '["string","hash-map"]' '["PYTHON","JAVASCRIPT"]' 3000 256 \
  '[{"input":"abcabcbb","expectedOutput":"3","isSample":true,"explanation":"abc"},{"input":"bbbbb","expectedOutput":"1","isSample":false,"explanation":""},{"input":"pwwkew","expectedOutput":"3","isSample":false,"explanation":""}]')
echo "  longest-substring: $PB8"

# --- Contests ---
echo "[seed] contests..."
NOW=$(date -u +%s)
START=$(( NOW - 3600 ))
END=$(( NOW + 86400 ))
START_ISO=$(date -u -d "@$START" +%Y-%m-%dT%H:%M:%SZ)
END_ISO=$(date -u -d "@$END" +%Y-%m-%dT%H:%M:%SZ)

CONTEST1=$(curl -s -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"slug\":\"weekly-001\",\"title\":\"Weekly Contest 001\",\"description\":\"Beginner-friendly weekly contest\",\"startsAt\":\"$START_ISO\",\"endsAt\":\"$END_ISO\",\"problemIds\":[\"$PB1\",\"$PB2\",\"$PB6\"]}" \
  "$CONTESTS/v1/contests" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or d)")
echo "  weekly-001 (LIVE): $CONTEST1"

START2=$(( NOW + 86400 ))
END2=$(( NOW + 90000 ))
START2_ISO=$(date -u -d "@$START2" +%Y-%m-%dT%H:%M:%SZ)
END2_ISO=$(date -u -d "@$END2" +%Y-%m-%dT%H:%M:%SZ)

CONTEST2=$(curl -s -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"slug\":\"weekly-002\",\"title\":\"Weekly Contest 002\",\"description\":\"Intermediate contest\",\"startsAt\":\"$START2_ISO\",\"endsAt\":\"$END2_ISO\",\"problemIds\":[\"$PB3\",\"$PB4\",\"$PB5\"]}" \
  "$CONTESTS/v1/contests" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or d)")
echo "  weekly-002 (UPCOMING): $CONTEST2"

echo ""
echo "[seed] done"
echo "  problemas creados: 8"
echo "  contests creados: 2"
