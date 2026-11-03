import { describe, expect, it } from 'vitest'
import { buildFaqJsonLd } from '../app/utils/faq-jsonld'
import type { PublicFaqEntry } from '@serag/shared'

describe('buildFaqJsonLd', () => {
  it('returns null when given empty array', () => {
    expect(buildFaqJsonLd([])).toBeNull()
  })

  it('builds valid Schema.org FAQPage structured data and strips HTML from answers', () => {
    const entries: PublicFaqEntry[] = [
      {
        id: 'faq-1',
        topic: 'warranty',
        question: 'ما هي مدة الضمان؟',
        answer: '<p>الضمان <strong>سنتان</strong> معتمدتان من الوكيل.</p>',
        sort: 0,
      },
      {
        id: 'faq-2',
        topic: 'returns',
        question: 'هل يمكن الاسترجاع؟',
        answer: '<p>نعم خلال 14 يوماً من <a href="/terms">الاستلام</a>.</p>',
        sort: 1,
      },
    ]

    const result = buildFaqJsonLd(entries)
    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'ما هي مدة الضمان؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'الضمان سنتان معتمدتان من الوكيل.',
          },
        },
        {
          '@type': 'Question',
          name: 'هل يمكن الاسترجاع؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'نعم خلال 14 يوماً من الاستلام.',
          },
        },
      ],
    })
  })
})
