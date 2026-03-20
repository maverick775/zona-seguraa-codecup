---
trigger: glob
globs: zona-seguraa/src/app/api/**
---

# Backend API Rule

- Keep route handlers thin; move shared business logic to `src/lib/**`.
- Validate input at the boundary and return explicit 4xx/5xx responses.
- Keep alert levels coherent with contracts:
  - 1 `low`, 2 `medium`, 3 `high`, 4 `critical`.
- Respect community validation threshold from contracts (default: 60%).
- If DB shape changes, update schema + seed + contracts in the same change.