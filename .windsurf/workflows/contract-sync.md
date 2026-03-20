# contract-sync

Use when FE and BE changed a shared screen flow.

## Inputs
- Module route (example: `/zone/[slug]`)
- Changed endpoints
- Breaking change (`yes` or `no`)

## Steps
1. Update the module contract JSON for the screen.
2. Update endpoint definitions and examples.
3. Add a changelog entry with date and owner.
4. If breaking, include migration notes and mark `breaking_change: true`.