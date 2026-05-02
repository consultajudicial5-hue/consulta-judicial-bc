import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { scrapeBoletin, type ScrapedExpediente } from './scraper'

describe('Scraper Module', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('scrapeBoletin', () => {
    it('should return demo data when fetch fails', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('mexicali')

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].ciudad).toBe('mexicali')
      expect(result[0].fecha).toBe('2024-01-15')
    })

    it.skip('should return demo data when fetch times out', async () => {
      // Mock fetch to hang
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))

      const promise = scrapeBoletin('mexicali')

      // Advance timers to trigger timeout
      await vi.advanceTimersByTimeAsync(16_000)

      const result = await promise

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    }, 10000) // Set a longer timeout for this test

    it('should return demo data when HTTP status is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as Response)

      const result = await scrapeBoletin('mexicali')

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].ciudad).toBe('mexicali')
    })

    it('should parse HTML table structure correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <table>
              <tr>
                <td>123/2024</td>
                <td>García vs Martínez</td>
                <td>Juzgado Primero Civil</td>
                <td>Se admite la demanda</td>
              </tr>
              <tr>
                <td>124/2024</td>
                <td>López vs Hernández</td>
                <td>Juzgado Segundo Penal</td>
                <td>Se señala audiencia</td>
              </tr>
            </table>
          </body>
        </html>
      `

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response)

      const result = await scrapeBoletin('mexicali')

      expect(result).toHaveLength(2)
      expect(result[0].expediente).toBe('123/2024')
      expect(result[0].partes).toBe('García vs Martínez')
      expect(result[0].juzgado).toBe('Juzgado Primero Civil')
      expect(result[0].acuerdo).toBe('Se admite la demanda')
      expect(result[0].ciudad).toBe('mexicali')
      expect(result[0].fecha).toBe('2024-01-15')
    })

    it('should sanitize text by removing control characters', async () => {
      const mockHtml = `
        <html>
          <body>
            <table>
              <tr>
                <td>123/2024\x00\x08</td>
                <td>García\x0B vs \x0CMartínez</td>
                <td>Juzgado\x1F Primero</td>
                <td>Se admite\x7F</td>
              </tr>
            </table>
          </body>
        </html>
      `

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response)

      const result = await scrapeBoletin('mexicali')

      expect(result[0].expediente).toBe('123/2024')
      expect(result[0].partes).toBe('García vs Martínez')
      expect(result[0].juzgado).toBe('Juzgado Primero')
      expect(result[0].acuerdo).toBe('Se admite')
    })

    it('should only parse rows with expediente numbers', async () => {
      const mockHtml = `
        <html>
          <body>
            <table>
              <tr>
                <td>Expediente</td>
                <td>Partes</td>
                <td>Juzgado</td>
              </tr>
              <tr>
                <td>123/2024</td>
                <td>García vs Martínez</td>
                <td>Juzgado Primero</td>
              </tr>
              <tr>
                <td>No expediente</td>
                <td>Some text</td>
                <td>Some court</td>
              </tr>
            </table>
          </body>
        </html>
      `

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response)

      const result = await scrapeBoletin('mexicali')

      // Should only include the row with a number in expediente
      expect(result).toHaveLength(1)
      expect(result[0].expediente).toBe('123/2024')
    })

    it('should use correct URL with ciudad and fecha parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><table></table></body></html>',
      } as Response)

      global.fetch = mockFetch

      await scrapeBoletin('Tijuana')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ciudad=tijuana'),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('fecha=2024-01-15'),
        expect.any(Object)
      )
    })

    it('should normalize ciudad to lowercase', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><table></table></body></html>',
      } as Response)

      global.fetch = mockFetch

      await scrapeBoletin('  MEXICALI  ')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ciudad=mexicali'),
        expect.any(Object)
      )
    })

    it('should include proper User-Agent header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><table></table></body></html>',
      } as Response)

      global.fetch = mockFetch

      await scrapeBoletin('mexicali')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('ConsultaJudicialBC'),
          }),
        })
      )
    })

    it('should try alternative parsing strategy when no table found', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="expediente" data-expediente="123/2024">
              <span class="numero">123/2024</span>
              <span class="partes">García vs Martínez</span>
              <span class="juzgado">Juzgado Primero</span>
              <span class="acuerdo">Se admite</span>
            </div>
          </body>
        </html>
      `

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response)

      const result = await scrapeBoletin('mexicali')

      expect(result.length).toBeGreaterThan(0)
      expect(result[0].expediente).toBe('123/2024')
    })
  })

  describe('Demo data generation', () => {
    it('should generate demo data for mexicali', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('mexicali')

      expect(result.length).toBe(8)
      expect(result.every(e => e.ciudad === 'mexicali')).toBe(true)
      expect(result.every(e => e.fecha === '2024-01-15')).toBe(true)
      expect(result.every(e => e.expediente.includes('/'))).toBe(true)
    })

    it('should generate demo data for tijuana', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('tijuana')

      expect(result.length).toBe(8)
      expect(result.every(e => e.ciudad === 'tijuana')).toBe(true)
    })

    it('should generate demo data for ensenada', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('ensenada')

      expect(result.length).toBe(8)
      expect(result.every(e => e.ciudad === 'ensenada')).toBe(true)
    })

    it('should generate demo data for unknown cities', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('unknown-city')

      expect(result.length).toBe(8)
      expect(result.every(e => e.ciudad === 'unknown-city')).toBe(true)
    })

    it('should generate expedientes with current year', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('mexicali')

      expect(result.every(e => e.expediente.includes('/2024'))).toBe(true)
    })

    it('should cycle through predefined juzgados', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('mexicali')

      const juzgados = new Set(result.map(e => e.juzgado))
      expect(juzgados.size).toBeGreaterThan(1)
      expect(result.some(e => e.juzgado.includes('Civil'))).toBe(true)
    })

    it('should cycle through predefined acuerdos', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('mexicali')

      const acuerdos = new Set(result.map(e => e.acuerdo))
      expect(acuerdos.size).toBeGreaterThan(1)
      expect(result.some(e => e.acuerdo.includes('demanda'))).toBe(true)
    })
  })

  describe('Date formatting', () => {
    it('should format date as YYYY-MM-DD', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('mexicali')

      expect(result[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result[0].fecha).toBe('2024-01-15')
    })

    it('should pad month with zero', async () => {
      vi.setSystemTime(new Date('2024-03-05T12:00:00Z'))
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('mexicali')

      expect(result[0].fecha).toBe('2024-03-05')
    })

    it('should pad day with zero', async () => {
      vi.setSystemTime(new Date('2024-11-09T12:00:00Z'))
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await scrapeBoletin('mexicali')

      expect(result[0].fecha).toBe('2024-11-09')
    })
  })
})
