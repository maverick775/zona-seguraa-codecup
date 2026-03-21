---
description: Create or update a FE/BE contract for a screen or feature
---

# New / Update Contract

1. Identify which screen or feature needs the contract.

2. Create or edit the file in `CreatingAgentAssets/contracts/XX-<name>.md` following the numbering convention:
   - `01-zona-home.md`
   - `02-alert-report.md`
   - `03-alert-detail.md`
   - `04-communities.md`
   - `05-coordinator-dashboard.md`

3. Include these sections:
   - **Ruta FE** — path and component location
   - **Entidades involucradas** — tables and fields used
   - **API Endpoints** — method, path, request/response JSON
   - **Componentes FE** — table of components and their purpose
   - **Realtime** — Supabase channels if applicable
   - **Última actualización** — date

4. Both teams (FE and BE) must review and approve (PR comment or thumbs up) before implementation begins.

5. Commit the contract so the counterpart team can pull it and stay in sync.
