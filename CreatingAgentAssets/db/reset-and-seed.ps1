param(
  [string]$DbUrl = $env:SUPABASE_DB_URL
)

if (-not $DbUrl) {
  Write-Error "Set SUPABASE_DB_URL (postgres connection string) before running this script."
  exit 1
}

$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
  Write-Error "psql was not found in PATH. Install PostgreSQL client tools and retry."
  exit 1
}

$dbDir = $PSScriptRoot
$rootDir = Split-Path -Parent $dbDir

Write-Host "[db] Resetting schema..."
& psql "$DbUrl" -v ON_ERROR_STOP=1 -f "$dbDir/reset.sql"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[db] Seeding baseline data..."
& psql "$DbUrl" -v ON_ERROR_STOP=1 -f "$rootDir/seederZS.txt"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[db] Running verification queries..."
& psql "$DbUrl" -v ON_ERROR_STOP=1 -f "$dbDir/verification.sql"
exit $LASTEXITCODE