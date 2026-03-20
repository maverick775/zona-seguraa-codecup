# FE/UI-UX Considerations Mapping

## Mapeo de consideraciones -> modulo/contrato

1. SOS prominente activable en 1 segundo
- Modulo: `/zone/[slug]`
- Contrato: `contracts/modules/zone-home.contract.json`
- Regla: `.windsurf/rules/frontend-ui.md`

2. Alto contraste, TTS y vibracion escalable
- Modulo: `/zone/[slug]`, `/alert/[id]`
- Contratos: `zone-home.contract.json`, `alert-detail.contract.json`

3. Blindaje falsas alarmas (3s + validacion 60%)
- Modulo: `/zone/[slug]`, `/api/votes`
- Contratos: `zone-home.contract.json`, `api/endpoints.contract.json`

4. IA edge para contexto (hora/ubicacion)
- Modulo: `/alert/[id]`
- Contrato: `alert-detail.contract.json` (recomendaciones/context_summary)

5. Colores base azul/verde y gradientes suaves
- Archivo: `docs/frontend-tokens.css`
- Regla: `.windsurf/rules/frontend-ui.md`

6. Mensaje de calma sin panico
- Modulo: `/alert/[id]`, `/coordinator/alert/[id]`
- Contratos: `alert-detail.contract.json`, `coordinator-alert-detail.contract.json`

7. Niveles de alerta 4 niveles y codigos
- Modulo: `/zone/[slug]`, `/alert/new`
- Contratos: `zone-home.contract.json`, `alert-report.contract.json`

8. Expansiones por nivel (mapa, pasos, contactos)
- Modulo: `/alert/[id]`
- Contrato: `alert-detail.contract.json`

9. Escalamiento de notificaciones por urgencia
- Modulo: `/coordinator/dashboard`
- Contrato: `coordinator-dashboard.contract.json`

10. Timeline y mensajes situacionales claros
- Modulo: `/alert/[id]`
- Contrato: `alert-detail.contract.json`

11. Multicanal (push/SMS/WhatsApp/offline LoRaWAN)
- Modulo/API: `/api/iot/downlink`, `notification_events`
- Contratos: `api/endpoints.contract.json`, `db/schema.sql`

12. Recomendaciones personalizadas por perfil
- Modulo: `/alert/[id]`
- Contrato: `alert-detail.contract.json`

13. Mensajes por nivel (bajo vs critico)
- Modulo: `/alert/[id]`
- Contrato: `alert-detail.contract.json`

14. Iconos universales y geolocalizacion precisa
- Modulo: `/alert/new`, `/zone/[slug]`
- Contratos: `alert-report.contract.json`, `zone-home.contract.json`

15. Feedback "Estoy seguro" post-alerta
- Modulo: `/alert/[id]`
- Contrato: `alert-detail.contract.json`

16. Pruebas A/B ZMG para estres/efectividad
- Operacion: backlog de experimento
- Archivo: `runbook/agent-scope-runbook.md` (flujo operativo)

17. Integracion piloto C5 Zapopan 2026
- API futuro: integra endpoint externo por feature flag
- Contratos base: `api/endpoints.contract.json`

18. Resumen post-alerta con tips y rutas seguras
- Modulo: `/coordinator/alert/[id]` y `/alert/[id]`
- Contratos: `coordinator-alert-detail.contract.json`, `alert-detail.contract.json`