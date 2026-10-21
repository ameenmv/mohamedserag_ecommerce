import { config } from 'zod/v4/core'

// Zod 4 probes `new Function` before its first parse to decide whether to JIT-compile
// schemas. Under our CSP (no 'unsafe-eval') that probe is blocked and reported as a
// violation even though Zod swallows the error, so skip it. Set at import time so it
// runs before any schema in `@serag/shared` parses. `zod/v4/core` keeps this import tiny
// (importing `z` would pull all of Zod into every page).
config({ jitless: true })

export default defineNuxtPlugin(() => {})
