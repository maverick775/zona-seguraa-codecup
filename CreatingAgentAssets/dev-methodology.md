# Metodología de Desarrollo Acelerado — Zona SeguRAA

> Objetivo: entregar un MVP verificable en < 4 sprints manteniendo contratos claros entre FE/BE y espacio para iteraciones rápidas.

## 1. Principios operativos
- **Tracción antes que perfección:** cada commit debe habilitar una acción observable por jurado/usuario.
- **Cadena de valor completa:** priorizar historias que atraviesen IoT → API → UI antes de optimizar capas aisladas.
- **Decisiones trazables:** documentar el *por qué* en PR o contratos, nunca duplicar documentación.
- **Reutilización táctica:** preferir librerías battle-tested (Supabase, Leaflet, Loriot SDK) antes de reinventar.
- **Fail-fast:** feature flags locales (`NEXT_PUBLIC_FEATURE_*`) para activar/desactivar módulos sin ramas largas.

## 2. Flujo de trabajo
1. **Brief funcional** → actualizar contrato correspondiente en `CreatingAgentAssets/contracts/*`.
2. **Diseño técnico rápido** → pseudocódigo + queries Supabase en comentario `// why:` al inicio del archivo modificado.
3. **Implementación trunk-based**: ramas <48h, PR pequeños, squash merge.
4. **Smoke tests**: `npm run lint && npm run test:smoke` antes del merge (scripts listados en `package.json`).
5. **Demo continua**: mantener `scripts/demo-mode.js` en sync con flows reales.

## 3. Backend / API
- **Next.js App Router (Route Handlers)**: 1 handler = 1 carpeta, siempre exportar `runtime = "edge"` cuando sea IO-bound.
- **Validación**: `zod` para payloads críticos; reutilizar esquemas desde `/lib/contracts` si aplica.
- **Supabase**: acceso server-side con `supabase-server.js`; never expose service key en client.
- **Estados de alerta**: usar enum (`draft`, `active`, `in_progress`, `resolved`, `dismissed`). Solo coordinadores mutan >`active`.
- **Jobs rápidos**: usar `Promise.allSettled` para fan-out de notificaciones, nunca colas externas en MVP.

## 4. Frontend / UX
- **App Router** segmentado por rol: `/zone/[slug]` (visitante) y `/coordinator` (dashboard).
- **UI tokens**: importar `src/styles/tokens.css` para paleta oficial (ver README).
- **Accesibilidad**: componentes SOS usan `prefers-reduced-motion`, `aria-live`, `vibration` via Web APIs (feature-detect).
- **Tiempo real**: Hooks personalizados (`useAlertsRealtime`) encapsulan Supabase channel + fallback polling.
- **Edge AI hints**: mostrar badges contextuales (hora pico, densidad) usando helper `lib/context-score.js`.

## 5. Datos y seed
- **Fuente única**: `CreatingAgentAssets/db/schema.md` define tablas obligatorias.
- **Regenerar**: `supabase db reset && psql < CreatingAgentAssets/seederZS.txt` (ver runbook).
- **Versionado**: cambios en schema requieren actualizar `db/schema.md` + seed + contratos relacionados.

## 6. Observabilidad y calidad
- **Logs estructurados**: `console.info('[alerts.create]', { alertId, level })` para correlacionar en Vercel.
- **Métricas mínimas**: tiempo de respuesta SOS, porcentaje de falsas alarmas, tiempo de validación comunitaria.
- **Pruebas**: unitarias en helpers críticos (`edge-ai`, `validators`), e2e ligeras con Playwright solo para flows SOS/coordinador.

## 7. Colaboración FE/BE
- **Contratos versionados**: cada pantalla tiene archivo en `CreatingAgentAssets/contracts/` con hash de última actualización.
- **Handshake formal**: no se codifica UI/API hasta que ambos lados firman (👍 en PR) el contrato.
- **Retro semanal**: lista de bloqueos + métricas DORA (lead time, deployment freq) para ajustar práctica.

## 8. Investigación continua
- Revisar benchmarks de emergencias urbanas (MassNotification UX, FEMA guidelines) cada sprint.
- Adoptar mejoras de clean code modernas: funciones puras, dependencia explícita vía argumentos, sin singletons ocultos.
- Mantener backlog de experimentos IA-Edge vs Cloud para siguientes fases.
