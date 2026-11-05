/**
 * The مد (kashida) of Arabic headlines: tatweel characters (U+0640) inserted inside words, as on
 * font.thmanyah.com. Placement follows Arabic calligraphy, and is a pure function of the title, so
 * every title gets its own pattern but the same title always looks the same.
 */

export type MadSize = 'xl' | 'lg' | 'md'

const TATWEEL = String.fromCharCode(0x0640)
// Code point tests instead of regex classes: the combining marks trip no-misleading-character-class
function isLetter(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0
  return code >= 0x0621 && code <= 0x064a
}
function isMark(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0
  return (code >= 0x064b && code <= 0x065f) || code === 0x0670
}

/** The Arabic words of a text (letters, tashkeel and tatweel) with their positions. */
function findWords(text: string): { text: string; index: number }[] {
  const words: { text: string; index: number }[] = []
  let start = -1
  for (let i = 0; i <= text.length; i += 1) {
    const ch = text[i] ?? ''
    const inWord = ch !== '' && (isLetter(ch) || isMark(ch) || ch === TATWEEL)
    if (inWord && start === -1) start = i
    if (!inWord && start !== -1) {
      words.push({ text: text.slice(start, i), index: start })
      start = -1
    }
  }
  return words
}

// Letters that never join the letter after them
const NO_JOIN_FORWARD = new Set('ادذرزوؤةءأإآىٱ')
const STRONG = new Set('سشصض')
const GOOD = new Set('بتثنيئفق')
const OK = new Set('كمهعغحخجطظل')
const LAM_ALEF = new Set('اأإآٱ')

const RUN_BY_SIZE: Record<MadSize, number> = { xl: 3, lg: 2, md: 1 }

interface Token {
  ch: string
  marks: string
}

function tokenize(word: string): Token[] {
  const tokens: Token[] = []
  for (const ch of word) {
    if (isMark(ch) && tokens.length > 0) tokens[tokens.length - 1]!.marks += ch
    else tokens.push({ ch, marks: '' })
  }
  return tokens
}

/** The best gap (index of the letter to stretch after) of a word, or null when none is allowed. */
function bestGap(tokens: Token[]): number | null {
  let best: number | null = null
  let bestScore = -Infinity
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const here = tokens[i]!.ch
    const next = tokens[i + 1]!.ch
    if (NO_JOIN_FORWARD.has(here) || next === 'ء') continue
    if (here === 'ل' && LAM_ALEF.has(next)) continue
    let score = STRONG.has(here) ? 100 : GOOD.has(here) ? 80 : OK.has(here) ? 55 : 40
    if (i === 0) score -= 25
    if (i === 1) score += 5
    if (i + 1 === tokens.length - 1) score -= 15
    if (score > bestScore) {
      best = i
      bestScore = score
    }
  }
  return best
}

/**
 * Adds a مد to a title. Words under 3 letters, Latin text and digits stay as they are, and a text
 * that already has a tatweel is left exactly as the editor wrote it.
 */
export function addMad(text: string, options: { size?: MadSize } = {}): string {
  if (!text || text.includes(TATWEEL)) return text
  const size = options.size ?? 'lg'

  const words: { start: number; end: number; tokens: Token[]; gap: number }[] = []
  for (const match of findWords(text)) {
    const tokens = tokenize(match.text)
    if (tokens.filter((token) => isLetter(token.ch)).length < 3) continue
    const gap = bestGap(tokens)
    if (gap === null) continue
    words.push({ start: match.index, end: match.index + match.text.length, tokens, gap })
  }
  if (words.length === 0) return text

  // Which words get a run: a short title stretches all its words, a longer one its first word and
  // the longest of the rest (two words), or its first and last (four or more); `md` stretches one.
  let chosen = words
  if (words.length === 3) {
    const rest = words.slice(1)
    const longest = rest.reduce((a, b) => (b.tokens.length >= a.tokens.length ? b : a))
    chosen = [words[0]!, longest]
  } else if (words.length >= 4) {
    chosen = [words[0]!, words[words.length - 1]!]
  }
  if (size === 'md') {
    chosen = [chosen.reduce((a, b) => (b.tokens.length > a.tokens.length ? b : a))]
  }

  const run = RUN_BY_SIZE[size]
  let result = text
  // From the end, so earlier indexes stay valid
  for (const [order, word] of [...chosen].reverse().entries()) {
    const isSecond = chosen.length > 1 && order === 0
    const length = isSecond ? Math.max(1, run - 1) : run
    const before = word.tokens
      .slice(0, word.gap + 1)
      .map((token) => token.ch + token.marks)
      .join('')
    const after = word.tokens
      .slice(word.gap + 1)
      .map((token) => token.ch + token.marks)
      .join('')
    result = result.slice(0, word.start) + before + TATWEEL.repeat(length) + after + result.slice(word.end)
  }
  return result
}
