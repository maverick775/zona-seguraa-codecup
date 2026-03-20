---
trigger: glob
globs: zona-seguraa/src/**
---

# Frontend Alert UX Rule

- Keep SOS entry visible and operable in <=1 second.
- Require 3-second long press before firing critical alerts.
- Support accessibility fallbacks: high contrast, TTS text, and vibration scale.
- Keep the base palette aligned with these tokens:
  - `--primary-teal: #2b7a78`
  - `--emergency-red: #e63946`
  - `--admin-purple: #a020f0`
  - `--ally-blue: #3a86ff`
  - `--bg-light: #f8f9fa`
  - `--text-dark: #1d1d1f`
  - `--text-muted: #6c757d`
  - `--border-light: #e9ecef`