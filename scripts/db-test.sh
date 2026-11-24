#!/usr/bin/env bash
# Recria um banco local, aplica stub do Supabase + migrations + seed e roda os testes SQL.
# Uso: PGHOST=/tmp PGPORT=54322 PGUSER=postgres ./scripts/db-test.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${TEST_DB:-agendas_pro_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null

"${PSQL[@]}" -d "$DB" -f supabase/tests/_local_supabase_stub.sql >/dev/null
for f in supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f" >/dev/null
done
echo "→ seed.sql"
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql >/dev/null

status=0
for t in supabase/tests/[0-9]*.sql; do
  echo "▶ $(basename "$t")"
  if ! "${PSQL[@]}" -d "$DB" -f "$t"; then status=1; fi
done
exit $status
