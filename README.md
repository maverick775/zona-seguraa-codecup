# Zona SeguRAA — CodeCup 2026

> **Red colaborativa de alerta para zonas públicas abiertas**  
> Demo venue: **Fan Fest— Zona Centro de Guadalajara (ZMG)** · 24/7 · flujo ciudadano distribuido

[![Estado](https://img.shields.io/badge/Sprint-1%20Backend-blue)]()
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black)]()
[![Stack](https://img.shields.io/badge/Stack-Next.js%2014%20%2B%20Supabase-green)]()

---

## ¿Qué es Zona SeguRAA?

Zona SeguRAA habilita una **respuesta ciudadana orquestada** en espacios abiertos como corredores urbanos, plazas y estaciones de transferencia. Combinamos **nodos IoT LoRaWAN** (AVP3-ALFA: Raspberry Pi Pico 2 + RFM95W) con una **app web accesible** para detectar, validar y escalar incidentes con menos del 10 % de falsas alarmas.

Capas clave:
- **IoT + Edge AI:** Nodos físicos capturan métricas contextuales (hora, ruido, movimiento) y ejecutan filtros locales para reducir disparos accidentales antes de transmitir por LoRaWAN → Gateway Milesight UG63 → Loriot → API.
- **Capa colaborativa:** Cualquier visitante puede activar el botón SOS accesible en <1 s; la comunidad valida con roles diferenciados; la IA contextual propone nivel y acciones; coordinadores del C5 Zapopan/Piloto 2026 reciben alertas priorizadas.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) · JavaScript · Tailwind CSS |
| Backend | Next.js API Routes · Supabase PostgreSQL |
| Realtime | Supabase Realtime (WebSocket) |
| Mapas | Leaflet + react-leaflet |
| IoT | LoRaWAN US915 · Loriot Network Server · Milesight UG63 |
| Hardware | Raspberry Pi Pico 2 + RFM95W · Heltec LoRa 32 |
| Deploy | Vercel (frontend/backend) · Supabase Cloud |

---

## Estructura del repositorio

```
zona-seguraa-codecup/
└── zona-seguraa/              # Aplicación Next.js principal
    ├── src/
    │   ├── app/
    │   │   ├── api/           # API Routes (REST)
    │   │   │   ├── alerts/    # S1-B1: CRUD alertas
    │   │   │   ├── votes/     # S1-B2: Votos y escalada automática
    │   │   │   └── coordinator/login/   # S1-B5: Auth coordinadores
    │   │   ├── health/        # Smoke test de conexión Supabase
    │   │   └── page.js        # Página principal (en construcción)
    │   └── middleware.js      # Protección de rutas /coordinator/*
    └── lib/
        ├── supabase.js        # Cliente browser (anon key)
        ├── supabase-server.js # Cliente servidor (service role)
        ├── loriot.js          # Downlinks, uplink parser, validator
        └── leaflet-config.js  # Fix SSR para Leaflet en Next.js
CreatingAgentAssets/
├── dev-methodology.md         # Guía de entorno/método acelerado
├── db/schema.md               # Contrato del modelo de datos
├── contracts/                 # Contratos FE/BE por pantalla
├── runbook.md                 # Alcance permitido para el agente
└── seederZS.txt               # Zona pública (FanFest)
```

---

## Setup local

### Pre-requisitos
- Node.js 20+
- Cuenta en [Supabase](https://supabase.com) (proyecto ya existente)
- Cuenta en [Loriot](https://loriot.io) (aplicación ya registrada)

### 1. Clonar e instalar

```bash
git clone https://github.com/maverick775/zona-seguraa-codecup.git
cd zona-seguraa-codecup/zona-seguraa
npm install
```

### 2. Variables de entorno

Crea el archivo `.env.local` dentro de `zona-seguraa/`:

```env
# Supabase — obtener en: Settings → API dentro del proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Loriot — obtener en: Applications → tu app → API Token
LORIOT_SERVER=https://us1.loriot.io
LORIOT_APP_ID=XXXXXXXX
LORIOT_API_TOKEN=eyJ...
```

> ⚠️ **Nunca commitear `.env.local`** — está en `.gitignore`  
> Solicitar los valores al tech lead del equipo por canal privado

### 3. Verificar conexión

```bash
npm run dev
# Abrir: http://localhost:3000/health
# Respuesta esperada: { "status": "ok", "supabase": "connected", "zones": [...] }
```

---

## Estado del desarrollo — Sprint actual

> Última actualización: **20 Mar 2026** · Evento: **CodeCup 2026 · Hoy**

### ✅ Sprint 0 — Setup (Completado)
- [x] Proyecto Next.js inicializado con App Router
- [x] `lib/supabase.js` — cliente browser
- [x] `lib/supabase-server.js` — cliente servidor (service role)
- [x] `lib/loriot.js` — downlinks, parser de uplinks
- [x] `lib/leaflet-config.js` — fix SSR
- [x] Smoke test `/health` respondiendo `200 OK`
- [x] jsconfig.json con alias `@/*` → `src/*` + `@/lib/*` → `lib/*`

### 🔄 Sprint 1 — Backend Core (En progreso)
- [x] S1-B1: `POST /api/alerts` y `GET /api/alerts?zone_id=`
- [ ] S1-B2: `POST /api/votes` con escalada automática (nivel 1→2 con ≥3pts)
- [ ] S1-B3: `PATCH /api/alerts/[id]` — transiciones de estado con auth
- [ ] S1-B4: `POST /api/users/temp` — registro temporal con TTL 1h
- [ ] S1-B5: `POST /api/coordinator/login` + middleware de protección
- [ ] S1-IoT1: `POST /api/iot/uplink` — webhook receptor Loriot
- [ ] S1-IoT2: `POST /api/iot/downlink` — comando al AVP3

### ⏳ Sprint 2 — Dashboard + IoT (Pendiente)
- [ ] Dashboard coordinador con mapa Leaflet (Plaza Liberación)
- [ ] Panel de alertas con realtime WebSocket
- [ ] Vista pública del asistente (reporte de incidente)
- [ ] Integración física AVP3-ALFA + Heltec LoRa 32

---

## Arquitectura del sistema

```
[AVP3-ALFA]                    [Heltec LoRa 32]
Pico 2 + RFM95W                Terminal Portátil
     |  LoRaWAN US915                |
     └──────────┬────────────────────┘
                ▼
        [Milesight UG63]
         Gateway LoRaWAN
                |
                ▼
        [Loriot Network Server]
         us1.loriot.io
                |  HTTPS webhook
                ▼
    [Next.js API · Vercel]
     POST /api/iot/uplink
                |
                ▼
    [Supabase PostgreSQL]
     alerts · nodes · votes
                |  Realtime WS
                ▼
    [Dashboard Coordinador]
     Next.js · Leaflet · React
```

---

## Convenciones del equipo

- **Ramas:** `feature/S1-B1-alerts-api`, `fix/smoke-test-alias`, etc.
- **Commits:** `[S1-B1] feat: POST /api/alerts con validación de campos`
- **JS puro:** sin TypeScript — mantener consistencia en todo el proyecto
- **API responses:** siempre `NextResponse.json()`, nunca `Response` nativo
- **Imports:** usar alias `@/lib/...` y `@/components/...`, nunca rutas relativas con `../`
- **Secrets:** variables de entorno **solo** vía `.env.local` — confirmar con tech lead antes de deployar
- **Clean code aplicado:** documentar solo el *por qué* (razón de decisiones) y mantener funciones reutilizables y aisladas.
- **Contratos compartidos:** todo cambio en UI o API se negocia vía archivos de `CreatingAgentAssets/contracts/` y PR conjunto.

---

## Documentación operacional

- 📋 **System Overview** — arquitectura, modelo de datos, flujos (`CreatingAgentAssets/ZonaSeguRAA System Overview.docx`)
- 📅 **Sprint Plan** — historias de usuario, story points (`CreatingAgentAssets/ZonaSeguRAA - Sprint Plan.docx`)
- 🛠️ **Dev Setup Guide** — entorno (`CreatingAgentAssets/ZonaSeguRAA - Dev Setup.docx`)
- 🧭 **Metodología acelerada:** `CreatingAgentAssets/dev-methodology.md`
- 🔐 **Runbook y límites del agente:** `CreatingAgentAssets/runbook.md`
- 🤝 **Contratos FE/BE:** `CreatingAgentAssets/contracts/*`
- 🗂️ **Workflow Windsurf:** `.windsurf/workflows/*.md`

---

## Lineamientos UI/UX y accesibilidad

- Botón SOS prominente activable en <1 s con pulsación prolongada de 3 s.
- Validaciones comunitarias ≥60 % y feedback "Estoy seguro" post-evento.
- Edge AI correlaciona hora/ubicación para reducir falsas alarmas 90 %.
- Paleta base: `--primary-teal #2b7a78`, `--ally-blue #3a86ff`, `--bg-light #f8f9fa`, `--emergency-red #e63946`, `--admin-purple #a020f0`, textos `#1d1d1f/#6c757d`.
- Niveles de alerta (Bajo/Medio/Alto/Crítico) con mensajes calmados "Respira y sigue instrucciones" y escalamiento multicanal (push, SMS, WhatsApp, LoRaWAN offline).
- Recomendaciones personalizadas ("Evacua a punto Y", "Activa cámara") y mapas accesibles con íconos universales.

## Equipo

| Rol | Responsabilidad |
|---|---|
| Tech Lead / IoT | Firmware AVP3-ALFA, arquitectura, coordinación |
| Backend Dev | API Routes, Supabase, lógica de escalada |
| Frontend Dev | Dashboard, mapa Leaflet, realtime UI |

---

*Zona SeguRAA · CodeCup 2026 · Guadalajara, México*
*Made with ❤️ by Team Zona SeguRAA*
*Main developer: Erick Martínez Villa*