---
name: DB Seed
description: Ejecuta schema + seed en Supabase en el orden correcto
---

1. Lee `CreatingAgentAssets/db/schema.md` — identifica todas las tablas y dependencias
2. Lee `CreatingAgentAssets/seederZS.txt` — verifica compatibilidad con el schema
3. Reporta cualquier conflicto antes de continuar
4. Presenta los bloques SQL en orden de ejecución para copiar en el SQL Editor de Supabase
5. Proporciona la query de verificación final
