# Runbook — Zona SeguRAA · Alcance del Agente

> Define los límites y procedimientos permitidos para el agente de desarrollo dentro de este workspace.

## 1. Alcance de archivos

### Permitido
| Acción | Ruta |
|--------|------|
| Crear / editar | `zona-seguraa/src/**` |
| Crear / editar | `zona-seguraa/lib/**` |
| Crear / editar | `zona-seguraa/public/**` |
| Crear / editar | `zona-seguraa/scripts/**` |
| Crear / editar | `CreatingAgentAssets/**` |
| Crear / editar | `.windsurf/**` |
| Editar | `zona-seguraa/package.json` (solo agregar dependencias) |
| Editar | `zona-seguraa/next.config.mjs` |
| Editar | `zona-seguraa/jsconfig.json` |
| Editar | `zona-seguraa/eslint.config.mjs` |
| Editar | `zona-seguraa/postcss.config.mjs` |
| Editar | `README.md` |

### Prohibido (a menos que se indique explícitamente)
- Cualquier archivo fuera de `zona-seguraa-codecup/`.
- `zona-seguraa/.env.local` — contiene secrets; nunca leer ni escribir.
- `zona-seguraa/package-lock.json` — solo se modifica vía `npm install`.
- `.git/` — no manipular directamente.
- No ejecutar `git commit`, `git push` ni ningún comando git de escritura.

## 2. Base de datos

### Regenerar schema + seed
```bash
# Desde Supabase SQL Editor o CLI:
# 1. Ejecutar el contenido de CreatingAgentAssets/db/schema.md (sección SQL)
# 2. Ejecutar CreatingAgentAssets/seederZS.txt
```

### Reglas
- Toda modificación de tablas se refleja primero en `CreatingAgentAssets/db/schema.md`.
- Luego actualizar `CreatingAgentAssets/seederZS.txt` si hay columnas nuevas o renombradas.
- Luego actualizar contratos afectados en `CreatingAgentAssets/contracts/`.
- El agente puede proponer cambios de schema pero NO ejecutarlos contra Supabase directamente.

## 3. Dependencias

### Instalar paquetes
```bash
cd zona-seguraa && npm install <paquete>
```
- Solo instalar paquetes con licencia MIT/Apache/ISC.
- Preferir paquetes con >1k estrellas GitHub y mantenimiento activo (<6 meses último release).
- Antes de instalar, verificar que no exista funcionalidad equivalente en el stack actual.

### Prohibido
- No instalar TypeScript ni dependencias TS.
- No instalar ORMs (Prisma, Drizzle, etc.); usar Supabase client directamente.
- No instalar frameworks CSS adicionales; usar Tailwind CSS.

## 4. API Routes

### Convenciones
- 1 route handler = 1 carpeta en `src/app/api/`.
- Exportar funciones nombradas: `GET`, `POST`, `PATCH`, `DELETE`.
- Validar payloads con funciones puras en `lib/validators/`.
- Responder siempre con `NextResponse.json({ data, error }, { status })`.
- Logs estructurados: `console.info('[ruta.método]', { campos_relevantes })`.

## 5. Frontend

### Convenciones
- Componentes en `src/components/` con nombres PascalCase.
- Páginas en `src/app/` siguiendo App Router conventions.
- Hooks personalizados en `src/hooks/`.
- Estilos via Tailwind utilities + tokens CSS en `src/styles/tokens.css`.
- No usar `style={{}}` inline excepto para valores dinámicos de Leaflet.

## 6. Testing

### Permitido ejecutar
```bash
npm run lint          # ESLint
npm run build         # Verificar build
npm run dev           # Dev server local
```

### Smoke tests
- `/health` debe responder `{ status: "ok", supabase: "connected" }`.
- Verificar que las API routes respondan con estructura `{ data, error }`.

## 7. Contratos FE/BE

### Flujo de actualización
1. Modificar el contrato en `CreatingAgentAssets/contracts/<pantalla>.md`.
2. Ambos equipos revisan y aprueban (comentario o PR).
3. Solo entonces se implementa en código.
4. El contrato queda versionado en git para sincronización.

## 8. Demo Mode
- Script en `zona-seguraa/scripts/demo-mode.js`.
- Simula flujo completo (registro → SOS → votos → escalada → resolución).
- Usar como fallback si hardware IoT no está disponible.
- Mantener sincronizado con API routes reales.

## 9. Comandos prohibidos para el agente
- `git commit`, `git push`, `git merge`, `git rebase`
- `rm -rf` o equivalentes destructivos fuera del scope
- `npx supabase db reset` (requiere aprobación explícita del usuario)
- Cualquier comando que modifique estado de producción (Vercel, Supabase Cloud)
