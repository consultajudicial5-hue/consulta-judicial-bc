import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Replicate the SearchSchema from route.ts to test validation rules independently.
const SearchSchema = z.object({
  ciudad: z.string()
    .min(1, 'Ciudad requerida')
    .max(50)
    .regex(/^[a-záéíóúüñ\s-]+$/i, 'Ciudad inválida')
    .transform(v => v.toLowerCase().trim()),
  expediente: z.string().max(100).optional().default(''),
  partes: z.string().max(200).optional().default(''),
  fecha: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
})

describe('SearchSchema validation', () => {
  it('accepts a valid ciudad', () => {
    const result = SearchSchema.safeParse({ ciudad: 'Mexicali' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.ciudad).toBe('mexicali')
  })

  it('rejects an empty ciudad', () => {
    const result = SearchSchema.safeParse({ ciudad: '' })
    expect(result.success).toBe(false)
  })

  it('rejects ciudad with digits', () => {
    const result = SearchSchema.safeParse({ ciudad: 'ciudad123' })
    expect(result.success).toBe(false)
  })

  it('rejects ciudad longer than 50 chars', () => {
    const result = SearchSchema.safeParse({ ciudad: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('trims and lowercases ciudad', () => {
    const result = SearchSchema.safeParse({ ciudad: '  TIJUANA  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.ciudad).toBe('tijuana')
  })

  it('defaults page to 1 when missing', () => {
    const result = SearchSchema.safeParse({ ciudad: 'mexicali' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.page).toBe(1)
  })

  it('coerces page from string', () => {
    const result = SearchSchema.safeParse({ ciudad: 'mexicali', page: '3' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.page).toBe(3)
  })

  it('rejects page < 1', () => {
    const result = SearchSchema.safeParse({ ciudad: 'mexicali', page: '0' })
    expect(result.success).toBe(false)
  })

  it('rejects pageSize > 100', () => {
    const result = SearchSchema.safeParse({ ciudad: 'mexicali', pageSize: '200' })
    expect(result.success).toBe(false)
  })

  it('accepts optional expediente and partes', () => {
    const result = SearchSchema.safeParse({
      ciudad: 'ensenada',
      expediente: '123/2026',
      partes: 'García',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expediente).toBe('123/2026')
      expect(result.data.partes).toBe('García')
    }
  })

  it('rejects expediente longer than 100 chars', () => {
    const result = SearchSchema.safeParse({ ciudad: 'mexicali', expediente: 'x'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts accented characters in ciudad', () => {
    const result = SearchSchema.safeParse({ ciudad: 'Rosaritó' })
    expect(result.success).toBe(true)
  })
})
