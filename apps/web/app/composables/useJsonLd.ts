import type { MaybeRefOrGetter } from 'vue'

/**
 * Injects a single `application/ld+json` script tag identified by `key`.
 *
 * The `data` getter may return `null`/`undefined` (e.g. LocalBusiness while the store details are
 * placeholders); then no tag is rendered at all, so consumers never see an empty JSON block.
 */
export function useJsonLd(
  key: string,
  data: MaybeRefOrGetter<Record<string, unknown> | null | undefined>,
): void {
  useHead({
    script: () => {
      const value = toValue(data)
      return value ? [{ type: 'application/ld+json', key, innerHTML: JSON.stringify(value) }] : []
    },
  })
}
