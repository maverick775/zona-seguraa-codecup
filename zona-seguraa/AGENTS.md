# Zona SeguRAA App Rules (Next.js)

- Keep handlers and UI simple; optimize for MVP behavior first.
- This Next.js version may include breaking changes; check current Next docs before framework-specific edits.
- Follow contracts from `../CreatingAgentAssets/contracts/**` whenever route payloads or entities are touched.
- For API routes:
  - validate input early,
  - return explicit JSON errors,
  - keep business logic reusable in `src/lib/**`.
- For UI routes:
  - keep SOS actions accessible and fast,
  - preserve alert level semantics (1 low, 2 medium, 3 high, 4 critical),
  - use palette tokens defined in `../CreatingAgentAssets/docs/frontend-tokens.css`.
- Do not add verbose comments; add short why-notes only when needed.
