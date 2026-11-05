import { describe, expect, it } from 'vitest'
import { addMad } from '../app/utils/mad'

const T = 'ـ'

describe('addMad', () => {
  it('stretches the title of the home hero where a calligrapher would', () => {
    expect(addMad('ثقة لها تاريخ', { size: 'xl' })).toBe(`ثق${T}${T}${T}ة لها تاري${T}${T}خ`)
  })

  it('prefers seen, sheen, sad and dad', () => {
    expect(addMad('مسجد', { size: 'lg' })).toBe(`مس${T}${T}جد`)
  })

  it('never stretches after a letter that does not join forward', () => {
    const out = addMad('أدوات', { size: 'xl' })
    expect(out).not.toMatch(/[ادذرزوؤةءأإآ]ـ/)
  })

  it('never splits lam-alef', () => {
    expect(addMad('صلاة', { size: 'lg' })).not.toContain(`ل${T}ا`)
  })

  it('leaves words under 3 letters, Latin text and digits alone', () => {
    expect(addMad('من 1972 SERAG')).toBe('من 1972 SERAG')
    expect(addMad('')).toBe('')
  })

  it('leaves a text that already has a tatweel exactly as written', () => {
    expect(addMad(`تســوّق`)).toBe('تســوّق')
  })

  it('is deterministic', () => {
    expect(addMad('الأسئلة الشائعة', { size: 'lg' })).toBe(addMad('الأسئلة الشائعة', { size: 'lg' }))
  })

  it('gives different titles different patterns', () => {
    const a = addMad('تسوق حسب القسم')
    const b = addMad('عروض الفلاش')
    expect(a).not.toBe('تسوق حسب القسم')
    expect(b).not.toBe('عروض الفلاش')
    expect(a.replace(/ـ+/g, '')).toBe('تسوق حسب القسم')
    expect(b.replace(/ـ+/g, '')).toBe('عروض الفلاش')
    expect([...a].findIndex((c) => c === T)).not.toBe([...b].findIndex((c) => c === T))
  })

  it('stretches one word only for md', () => {
    const out = addMad('ثقة لها تاريخ', { size: 'md' })
    expect(out.split(T).length - 1).toBe(1)
  })

  it('keeps tashkeel attached to its letter', () => {
    const out = addMad('مُسْتَقْبَل', { size: 'lg' })
    expect(out.replace(/ـ+/g, '')).toBe('مُسْتَقْبَل')
  })
})
