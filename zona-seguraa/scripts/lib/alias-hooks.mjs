// Hooks de resolución para cargar API routes de Next con node:test, sin dependencias.
// Traduce '@/x' → src/x(.js|/index.js) y 'next/server' → 'next/server.js'.
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src')

export async function resolve(specifier, context, next) {
  if (specifier === 'next/server') return next('next/server.js', context)
  if (specifier.startsWith('@/')) {
    const base = path.join(SRC, specifier.slice(2))
    for (const candidate of [base, `${base}.js`, path.join(base, 'index.js')]) {
      if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
        if (candidate === base && !path.extname(base)) continue
        return next(pathToFileURL(candidate).href, context)
      }
    }
  }
  return next(specifier, context)
}
