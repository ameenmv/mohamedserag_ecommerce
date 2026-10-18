import type { ProductCard } from '@serag/shared'
import {
  hasCompareEntry,
  MAX_COMPARE_ITEMS,
  mixedCategories,
  replaceCompare,
  toggleCompare,
  type CompareEntry,
  type CompareToggleResult,
} from '../utils/compare'


export function useCompare() {
  const entries = useCompareEntries()

  const count = computed(() => entries.value.length)
  const isFull = computed(() => entries.value.length >= MAX_COMPARE_ITEMS)
  const isMixed = computed(() => mixedCategories(entries.value))
  const isEmpty = computed(() => entries.value.length === 0)

  function has(productId: string): boolean {
    return hasCompareEntry(entries.value, productId)
  }

  function toggle(
    item: ProductCard | CompareEntry | { id: string; category: { slug: string } },
  ): CompareToggleResult {
    const result = toggleCompare(entries.value, item)
    entries.value = result.entries
    return result.result
  }

  function replace(
    oldId: string,
    newItem: ProductCard | CompareEntry | { id: string; category: { slug: string } },
  ): void {
    entries.value = replaceCompare(entries.value, oldId, newItem)
  }

  function remove(productId: string): void {
    entries.value = entries.value.filter((e) => e.productId !== productId)
  }

  function clear(): void {
    entries.value = []
  }

  return {
    entries,
    count,
    isFull,
    isMixed,
    isEmpty,
    has,
    toggle,
    replace,
    remove,
    clear,
  }
}
