/**
 * Mirrors apps/web/app/constants/features.ts: tests of a switched-off feature are skipped,
 * not deleted, so they run again as soon as the flag is turned back on.
 */
export const BRIDAL_ENABLED = false

/** `skip` option for a bridal test: a reason while the feature is off. */
export const BRIDAL_SKIP: string | false = BRIDAL_ENABLED
  ? false
  : 'bridal builder is switched off (apps/web/app/constants/features.ts)'
