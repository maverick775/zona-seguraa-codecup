#!/usr/bin/env bash
# Aplica schema.md + seed + 001 + 002 + 003 en un PostgreSQL LOCAL y desechable, corre las
# pruebas y luego el rollback. Uso: PGHOST=/ruta/socket PGPORT=5499 ./run-local.sh
# Se niega a correr contra hosts remotos para no tocar bases compartidas.
set -euo pipefail
case "${PGHOST:-}" in
  /*|localhost|127.0.0.1) ;;
  *) echo "PGHOST debe ser local (socket, localhost o 127.0.0.1)"; exit 2;;
esac
DIR="$(cd "$(dirname "$0")" && pwd)"; DB="${TEST_DB:-signalarm_test}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -U "${PGUSER:-postgres}" -d "$DB")
dropdb -U "${PGUSER:-postgres}" --if-exists "$DB"; createdb -U "${PGUSER:-postgres}" "$DB"
"${PSQL[@]}" -f "$DIR/000_supabase_stub.sql"
# Extrae el bloque ```sql de schema.md
awk '/^```sql/{f=1;next}/^```/{f=0}f' "$DIR/../schema.md" | "${PSQL[@]}"
"${PSQL[@]}" -f "$DIR/../../seederZS.txt" >/dev/null
"${PSQL[@]}" -f "$DIR/../migrations/001_n0_reports.sql"
"${PSQL[@]}" -f "$DIR/../migrations/001_n0_reports.sql"   # reaplicar: debe ser idempotente
"${PSQL[@]}" -f "$DIR/001_n0_reports.test.sql"
"${PSQL[@]}" -f "$DIR/../migrations/002_votes_identity_rls.sql"
"${PSQL[@]}" -f "$DIR/../migrations/002_votes_identity_rls.sql"   # idempotente
"${PSQL[@]}" -f "$DIR/002_votes_identity_rls.test.sql"
"${PSQL[@]}" -f "$DIR/../migrations/003_reported_severity.sql"
"${PSQL[@]}" -f "$DIR/../migrations/003_reported_severity.sql"   # idempotente
"${PSQL[@]}" -f "$DIR/003_reported_severity.test.sql"
"${PSQL[@]}" -f "$DIR/../migrations/003_reported_severity.down.sql"
"${PSQL[@]}" -tc "SELECT 'rollback 003 ok: columnas=' || count(*) FROM information_schema.columns WHERE table_name='alerts' AND column_name='reported_severity'"
"${PSQL[@]}" -f "$DIR/../migrations/002_votes_identity_rls.down.sql"
"${PSQL[@]}" -f "$DIR/../migrations/001_n0_reports.down.sql"
"${PSQL[@]}" -tc "SELECT 'rollback ok: ' || pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='alerts_level_check'"
dropdb -U "${PGUSER:-postgres}" "$DB"
echo "OK"
