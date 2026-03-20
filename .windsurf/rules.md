# Zona SeguRAA — Reglas Globales del Agente

## Identidad del proyecto
- **Nombre:** Zona SeguRAA · CodeCup 2026
- **Venue demo:** Corredor Chapultepec — Zona Centro de Guadalajara (ZMG)
- **Propósito:** red colaborativa de alerta ciudadana para zonas públicas abiertas con validación comunitaria e IoT LoRaWAN

## Stack obligatorio
- **Runtime:** Node.js 20+
- **Framework:** Next.js 14 App Router — JavaScript puro (sin TypeScript)
- **Estilos:** Tailwind CSS v4+ con tokens definidos en `src/styles/tokens.css`
- **Base de datos:** Supabase PostgreSQL con Realtime habilitado
- **Mapas:** Leaflet + react-leaflet (SSR fix en `lib/leaflet-config.js`)
- **IoT:** LoRaWAN US915 → Loriot Network Server → webhook `/api/iot/uplink`
- **Deploy:** Vercel (frontend + API) · Supabase Cloud

## Reglas de código
1. Usar alias `@/*` → `src/*` y `@/lib/*` → `lib/*`; nunca rutas relativas con `../`.
2. API responses siempre con `NextResponse.json()`; nunca `Response` nativo.
3. Documentar solo el **por qué** de una decisión, no el qué hace el código.
4. Funciones aisladas y reutilizables; inyectar dependencias por argumento.
5. Imports siempre al inicio del archivo; nunca en medio del código.
6. No agregar emojis a archivos de código a menos que se solicite explícitamente.
7. Nombres descriptivos en inglés para variables/funciones; UI strings en español.

## Reglas de datos
1. Esquema canónico: `CreatingAgentAssets/db/schema.md` — toda modificación de tablas debe reflejarse ahí primero.
2. Seed canónico: `CreatingAgentAssets/seederZS.txt` — debe mantenerse consistente con el schema.
3. Al modificar el schema: purgar DB → recrear tablas → re-ejecutar seed.

## Reglas de contratos FE/BE
1. Cada pantalla tiene su contrato en `CreatingAgentAssets/contracts/*.md`.
2. No se codifica UI ni API sin contrato aprobado por ambos equipos.
3. Los contratos se comparten vía commits en git; la contraparte los descarga para sincronizar.

## Paleta de colores
```css
:root {
  --primary-teal: #2b7a78;
  --emergency-red: #e63946;
  --admin-purple: #a020f0;
  --ally-blue: #3a86ff;
  --bg-light: #f8f9fa;
  --text-dark: #1d1d1f;
  --text-muted: #6c757d;
  --border-light: #e9ecef;
}
```

## Niveles de alerta
| Nivel | Nombre | Color | Notificación |
|-------|--------|-------|-------------|
| 1 | Aviso (Bajo) | Amarillo `#f4a261` | Vibración suave |
| 2 | Advertencia (Medio) | Naranja `#e76f51` | Push notification |
| 3 | Peligro (Alto) | Rojo `#e63946` | Sonido + vibración |
| 4 | Emergencia | Rojo intenso `#d00000` | Sonido persistente |
| 5 | Crisis (Crítico) | Rojo + estrobo `#9d0208` | Sonido + estrobo + SMS |

## Accesibilidad
- Botón SOS activable en <1 s con pulsación prolongada 3 s para blindaje contra falsas alarmas.
- Soporte alto contraste, TTS y vibración escalable.
- `aria-live` en componentes de alerta; `prefers-reduced-motion` respetado.
- Mensajes calmados: "Respira y sigue instrucciones".

## Límites del agente
- No hacer commits — se manejan manualmente.
- No modificar archivos fuera de `zona-seguraa-codecup/` a menos que se indique explícitamente.
- Consultar `CreatingAgentAssets/runbook.md` para alcance detallado de acciones permitidas.
- Verbosidad mínima; funcionalidad sobre modularidad excesiva.
