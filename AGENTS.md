# AGENTS - Zona SeguRAA (Root)

## Purpose
Deliver the Zona SeguRAA MVP quickly with strong FE/BE contract sync and minimal operational overhead.

## Working style
- Keep output concise and implementation-focused.
- Prioritize vertical slices over deep modularization.
- Reuse trusted libraries before building custom infrastructure.

## Hard constraints
- Keep edits inside this workspace unless explicitly requested.
- Do not run git commit/rebase/history rewrite actions.
- If API payloads or DB entities change, update contracts in the same change.
- Keep code comments short and explain why, not what.

## Source of truth
- FE/BE contracts: `CreatingAgentAssets/contracts/**`
- DB structure: `CreatingAgentAssets/db/schema.sql`
- Seed baseline: `CreatingAgentAssets/seederZS.txt`
- Agent runbook: `CreatingAgentAssets/runbook/agent-scope-runbook.md`
- Windsurf automation: `.windsurf/**`

## UX guardrails
- SOS must be clearly visible and reachable in <=1 second.
- Critical alert activation requires a 3-second long press.
- Include accessibility support: high contrast, TTS text, vibration scaling.
- Respect project palette tokens in `CreatingAgentAssets/docs/frontend-tokens.css`.