/**
 * Splits a heading so its last `words` words can take the accent color, as in the prototype
 * («ثقة لها <تاريخ>», «أكبر المصانع <بتثق فينا>»). A one-word title has no highlight.
 */
export function splitHighlight(title: string, words = 1): { lead: string; highlight: string } {
  const parts = title.trim().split(/\s+/)
  if (parts.length <= words) return { lead: title.trim(), highlight: '' }
  return {
    lead: parts.slice(0, -words).join(' '),
    highlight: parts.slice(-words).join(' '),
  }
}
