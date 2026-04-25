import { describe, it, expect } from 'vitest'
import { parseBoletinHtml } from '@/lib/scraper'

const CIUDAD = 'mexicali'
const FECHA = '2026-04-25'

describe('parseBoletinHtml', () => {
  it('returns empty array for empty HTML', () => {
    expect(parseBoletinHtml('', CIUDAD, FECHA)).toEqual([])
  })

  it('returns empty array for HTML with no matching structure', () => {
    const html = '<html><body><p>Sin resultados</p></body></html>'
    expect(parseBoletinHtml(html, CIUDAD, FECHA)).toEqual([])
  })

  it('parses a simple table with 4 columns', () => {
    const html = `
      <table>
        <tr><th>Expediente</th><th>Partes</th><th>Juzgado</th><th>Acuerdo</th></tr>
        <tr>
          <td>123/2026</td>
          <td>García vs López</td>
          <td>Juzgado Primero Civil</td>
          <td>Se admite la demanda.</td>
        </tr>
        <tr>
          <td>456/2026</td>
          <td>Martínez vs Rodríguez</td>
          <td>Juzgado Segundo Penal</td>
          <td>Se señala audiencia.</td>
        </tr>
      </table>
    `
    const results = parseBoletinHtml(html, CIUDAD, FECHA)
    expect(results).toHaveLength(2)

    expect(results[0]).toMatchObject({
      expediente: '123/2026',
      partes: 'García vs López',
      juzgado: 'Juzgado Primero Civil',
      acuerdo: 'Se admite la demanda.',
      ciudad: CIUDAD,
      fecha: FECHA,
    })

    expect(results[1]).toMatchObject({
      expediente: '456/2026',
      partes: 'Martínez vs Rodríguez',
      juzgado: 'Juzgado Segundo Penal',
      acuerdo: 'Se señala audiencia.',
    })
  })

  it('skips header rows that have no digits in the expediente column', () => {
    const html = `
      <table>
        <tr><td>Expediente</td><td>Partes</td><td>Juzgado</td></tr>
        <tr><td>001/2026</td><td>A vs B</td><td>Juzgado Único</td></tr>
      </table>
    `
    const results = parseBoletinHtml(html, CIUDAD, FECHA)
    expect(results).toHaveLength(1)
    expect(results[0].expediente).toBe('001/2026')
  })

  it('parses div-based structure (strategy 2)', () => {
    const html = `
      <div class="boletin-item">
        <span class="expediente-num">789/2026</span>
        <span class="partes">Hernández vs Torres</span>
        <span class="juzgado">Juzgado Tercero Familiar</span>
        <span class="acuerdo">Se dicta sentencia.</span>
      </div>
    `
    const results = parseBoletinHtml(html, CIUDAD, FECHA)
    expect(results).toHaveLength(1)
    expect(results[0].expediente).toBe('789/2026')
  })

  it('strips control characters from cell text', () => {
    const html = `
      <table>
        <tr><td>100/2026\x01</td><td>A\x1F vs B</td><td>Juzgado</td></tr>
      </table>
    `
    const results = parseBoletinHtml(html, CIUDAD, FECHA)
    expect(results).toHaveLength(1)
    expect(results[0].expediente).toBe('100/2026')
    expect(results[0].partes).toBe('A vs B')
  })
})
