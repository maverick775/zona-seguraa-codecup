# DB Quick Guide

## Objetivo
Permitir iteraciones rapidas del esquema durante MVP: purgar, reconstruir y sembrar datos base.

## Archivos
- `schema.sql`: estructura fuente de la base.
- `reset.sql`: purge + recreate schema + include `schema.sql`.
- `verification.sql`: consultas de verificacion rapida.
- `reset-and-seed.ps1`: script de ejecucion completa.
- `../seederZS.txt`: datos base de zona publica.

## Uso
1. Exporta `SUPABASE_DB_URL`.
2. Ejecuta:
   - `pwsh ./CreatingAgentAssets/db/reset-and-seed.ps1`
3. Verifica salida de tablas y filas base.

## Regla
Si cambias `schema.sql`, revisa `seederZS.txt` y contratos (`CreatingAgentAssets/contracts/data/entities.contract.json`) en el mismo cambio.