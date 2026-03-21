# Windsurf Free + Supabase Cloud: conexion, automatizacion, limites y seguridad

Fecha de verificacion: 2026-03-20

## 1) Resumen ejecutivo
Si, **Windsurf Free** puede ejecutar tareas que impacten Supabase en la nube, pero hay dos rutas distintas:

1. **Via MCP de Supabase (recomendado)**: autenticacion OAuth/PAT, herramientas de DB, logs, migrations y SQL.
2. **Via terminal/comandos del proyecto**: usando variables de entorno (ej. URL/keys) y scripts/CLI.

La ruta MCP es mas controlable si activas **project scoping**, **read-only** y aprobacion manual de llamadas/herramientas.

## 2) Alcance real de impacto
Con credenciales/autorizacion validas, el agente puede:

- Leer tablas, extensiones, migraciones y logs.
- Ejecutar SQL (`execute_sql`).
- Aplicar migraciones (`apply_migration`).
- Desplegar funciones edge (`deploy_edge_function`).
- Obtener URL y llaves publicables.

Esto significa impacto real sobre datos y esquema si no se restringe el acceso.

## 3) Arquitectura recomendada para empezar (segura)

## Objetivo
Permitir automatizacion util sin exponer produccion ni permisos excesivos.

## Arquitectura
- Windsurf (Cascade) + MCP de Supabase hospedado.
- Proyecto Supabase **solo de desarrollo**.
- MCP configurado con `project_ref` (scoped) y `read_only=true` en fase inicial.
- Auto-ejecucion de comandos en Windsurf en `Disabled` o `Allowlist Only`.

## 4) Implementacion paso a paso

### Paso 0. Separar entorno
- Crea o usa un proyecto Supabase de desarrollo.
- Nunca conectes MCP a produccion durante pruebas.
- Si copias datos reales, enmascaralos primero.

### Paso 1. Configurar MCP de Supabase
- URL base MCP hospedado: `https://mcp.supabase.com/mcp`.
- En la configuracion, activa alcance por proyecto (`project_ref=<tu_ref>`).
- Activa `read_only=true` para primeras iteraciones.

Ejemplo de URL segura:

```text
https://mcp.supabase.com/mcp?project_ref=abc123&read_only=true
```

### Paso 2. Registrar MCP en Windsurf
Windsurf usa `~/.codeium/windsurf/mcp_config.json`.

Ejemplo minimo (HTTP MCP):

```json
{
  "mcpServers": {
    "supabase": {
      "serverUrl": "https://mcp.supabase.com/mcp?project_ref=abc123&read_only=true"
    }
  }
}
```

### Paso 3. Autenticacion
Opciones:

1. **OAuth dinamico** (preferido en local): el cliente abre navegador para login y otorgar acceso.
2. **PAT en headers** (util para CI o clientes sin OAuth dinamico).

Ejemplo con token por variable de entorno:

```json
{
  "mcpServers": {
    "supabase": {
      "serverUrl": "https://mcp.supabase.com/mcp?project_ref=${env:SUPABASE_PROJECT_REF}",
      "headers": {
        "Authorization": "Bearer ${env:SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

### Paso 4. Definir nivel de automatizacion en Windsurf
En terminal de Windsurf hay 4 niveles:

- `Disabled`: todo requiere aprobacion manual.
- `Allowlist Only`: solo comandos permitidos auto.
- `Auto`: juicio del agente; comandos riesgosos piden aprobacion.
- `Turbo`: casi todo auto, excepto deny list.

Recomendacion inicial:
- Empezar con `Disabled`.
- Pasar a `Allowlist Only` cuando flujo este estable.
- Evitar `Turbo` hasta tener controles maduros.

### Paso 5. Crear allow/deny list de comandos
Ejemplo de allow list inicial:
- `npm run lint`
- `npm run test`
- `supabase status`

Ejemplo de deny list inicial:
- `rm`
- `drop database`
- `truncate`
- `git reset --hard`

### Paso 6. Flujos de trabajo automaticos (sin perder control)
Patron recomendado:

1. Prompt: "inspecciona schema y propone migration".
2. MCP: lectura (`list_tables`, `list_migrations`).
3. Aprobacion humana del plan.
4. Escritura controlada (`apply_migration` o `execute_sql`).
5. Verificacion de resultados y logs.

## 5) Si quieres escritura automatica real
Cuando ya valides proceso en read-only:

1. Quita `read_only=true`.
2. Manten `project_ref` fijo.
3. Conserva aprobacion manual de tool calls para cambios destructivos.
4. Limita a una base de desarrollo.
5. Versiona migraciones; no hagas SQL ad-hoc en produccion.

## 6) Diferencia MCP vs credenciales directas en el proyecto

| Metodo | Ventaja | Riesgo principal | Recomendacion |
|---|---|---|---|
| Supabase MCP | Herramientas nativas y control por proyecto | Prompt injection y cambios no deseados si hay permisos de escritura | Usar `project_ref` + `read_only` al inicio |
| Variables directas (.env + service role) | Flexibilidad total en scripts/app | Exposicion accidental de llave de alto privilegio | Solo backend, nunca frontend |

## 7) Limitaciones clave

### Windsurf Free
- Los creditos de prompts son limitados por mes (la documentacion de uso muestra 25 mensuales).
- Cascade puede hacer hasta 20 tool calls por prompt; `continue` consume credito adicional.
- El nivel de auto-ejecucion `Auto` indica disponibilidad para mensajes con modelos premium.

### MCP en Windsurf
- Limite de hasta 100 herramientas MCP en total.
- Si un equipo enterprise whitelista MCPs, los no-whitelisted quedan bloqueados.

### Supabase MCP
- Supabase recomienda usar MCP para desarrollo/testing, no produccion.
- Riesgo de prompt injection al leer datos con instrucciones maliciosas incrustadas.
- Branching MCP es experimental y requiere plan pagado.
- Storage tools vienen desactivadas por defecto.
- En algunos clientes no hay soporte para headers custom (importa para PAT).
- Aun no hay control de permisos ultra-fino en todos los flujos (segun doc actual).

## 8) Controles de seguridad minimos (checklist)

- [ ] Proyecto Supabase de desarrollo separado.
- [ ] `project_ref` fijo en MCP.
- [ ] `read_only=true` en arranque.
- [ ] Aprobacion manual de tool calls activada.
- [ ] Auto-ejecucion terminal en `Disabled` o `Allowlist Only`.
- [ ] Deny list con comandos destructivos.
- [ ] No usar `service_role` en frontend.
- [ ] RLS habilitado en tablas de aplicacion.

## 9) Ejemplo de rollout por fases

### Fase 1 (1-2 dias)
- MCP conectado en read-only.
- Solo descubrimiento: tablas, migraciones, logs.

### Fase 2 (2-4 dias)
- Habilitar escritura en entorno dev.
- Migraciones pequenas con aprobacion humana.

### Fase 3 (estable)
- Automatizacion mayor en tareas repetitivas.
- Mantener guardrails y verificacion previa/posterior.

## 10) Riesgos operativos concretos

1. **SQL accidental destructivo**: mitigar con read-only, approvals y deny list.
2. **Prompt injection desde datos**: revisar tool calls y resultados antes de encadenar acciones.
3. **Credenciales filtradas**: usar variables de entorno e interpolation, no hardcode.
4. **Cruce entre proyectos**: siempre usar `project_ref`.

## 11) Respuesta directa a tu pregunta
Si tu objetivo es que Windsurf "afecte Supabase automaticamente" durante tareas:

- **Tecnicamente si se puede**.
- **La forma correcta** es MCP con `project_ref`, empezando read-only y subiendo permisos por fases.
- **La forma mas riesgosa** es dar llaves de alto privilegio y activar auto-ejecucion agresiva desde el inicio.

## 12) Fuentes oficiales utilizadas
- Windsurf Terminal (auto-exec levels, allow/deny): https://docs.windsurf.com/windsurf/terminal
- Windsurf MCP (config, interpolation, limites MCP): https://docs.windsurf.com/windsurf/cascade/mcp
- Windsurf Cascade overview (tool-calls por prompt, creditos de continue): https://docs.windsurf.com/es/windsurf/cascade/cascade
- Windsurf Usage (creditos mensuales y modelos 0-credit): https://docs.windsurf.com/accounts/usage
- Supabase MCP (setup, tools, params, seguridad): https://supabase.com/docs/guides/getting-started/mcp
- Supabase secure data (RLS, anon vs service role): https://supabase.com/docs/guides/database/secure-data

## 13) Notas de inferencia
- **Inferencia**: la documentacion de Windsurf MCP no marca un bloqueo explicito por plan Free para usar MCP; por eso se asume disponible en Free salvo restricciones de organizacion o creditos/modelos.
- **Inferencia**: para uso continuo "automatico", el cuello de botella practico suele ser creditos/modelo y no la conexion MCP en si.