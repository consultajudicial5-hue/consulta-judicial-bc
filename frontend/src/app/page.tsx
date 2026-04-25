'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Expediente {
  id?: number
  expediente: string
  partes: string
  juzgado: string
  ciudad: string
  fecha: string
  acuerdo: string
}

interface SearchResponse {
  results: Expediente[]
  total: number
  filteredTotal: number
  page: number
  pageSize: number
  totalPages: number
  cached: boolean
  fecha: string
  error?: string
}

interface SearchMeta {
  total: number
  filteredTotal: number
  page: number
  pageSize: number
  totalPages: number
  cached: boolean
  fecha: string
}

const CIUDADES = [
  { value: '', label: '— Selecciona una ciudad —' },
  { value: 'mexicali', label: 'Mexicali' },
  { value: 'tijuana', label: 'Tijuana' },
  { value: 'ensenada', label: 'Ensenada' },
  { value: 'tecate', label: 'Tecate' },
  { value: 'rosarito', label: 'Rosarito' },
]

const PAGE_SIZE = 25

function getTodayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Returns up to `maxVisible` page numbers centered around `currentPage`,
 * clamped within [1, totalPages]. Used to render a sliding-window pagination bar.
 */
function getPaginationPageNumbers(currentPage: number, totalPages: number, maxVisible = 5): number[] {
  const half = Math.floor(maxVisible / 2)
  // Compute the ideal start, then clamp the end, then re-clamp the start
  let start = Math.max(1, currentPage - half)
  const end = Math.min(totalPages, start + maxVisible - 1)
  start = Math.max(1, end - maxVisible + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export default function HomePage() {
  const [ciudad, setCiudad] = useState('')
  const [expediente, setExpediente] = useState('')
  const [partes, setPartes] = useState('')
  const [fecha, setFecha] = useState(getTodayDate())
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Expediente[]>([])
  const [meta, setMeta] = useState<SearchMeta | null>(null)
  const [error, setError] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback(async (params: {
    ciudad: string
    expediente?: string
    partes?: string
    fecha?: string
    page?: number
  }) => {
    if (!params.ciudad) return
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      qs.set('ciudad', params.ciudad)
      if (params.expediente) qs.set('expediente', params.expediente)
      if (params.partes) qs.set('partes', params.partes)
      if (params.fecha) qs.set('fecha', params.fecha)
      qs.set('page', String(params.page ?? 1))
      qs.set('pageSize', String(PAGE_SIZE))

      const res = await fetch(`/api/search?${qs.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Error ${res.status}`)
      }
      const data: SearchResponse = await res.json()
      setResults(data.results)
      setMeta({
        total: data.total,
        filteredTotal: data.filteredTotal,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
        cached: data.cached,
        fecha: data.fecha,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      setResults([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-search when city or date changes (reset to page 1)
  useEffect(() => {
    if (ciudad) {
      setPage(1)
      search({ ciudad, expediente: expediente || undefined, partes: partes || undefined, fecha, page: 1 })
    } else {
      setResults([])
      setMeta(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudad, fecha, search])

  // Debounced re-search when text filters change (reset to page 1)
  useEffect(() => {
    if (!ciudad) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      search({ ciudad, expediente: expediente || undefined, partes: partes || undefined, fecha, page: 1 })
    }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expediente, partes])

  // Re-search when page changes
  useEffect(() => {
    if (ciudad && meta) {
      search({ ciudad, expediente: expediente || undefined, partes: partes || undefined, fecha, page })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    search({ ciudad, expediente: expediente || undefined, partes: partes || undefined, fecha, page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-800">Consulta Judicial BC</h1>
        <p className="text-gray-600 mt-1">Boletín Judicial del Poder Judicial de Baja California</p>
      </header>

      {/* Search Form */}
      <form onSubmit={handleManualSearch} className="bg-white rounded-xl shadow p-6 mb-6" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ciudad */}
          <div>
            <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad <span className="text-red-500">*</span>
            </label>
            <select
              id="ciudad"
              value={ciudad}
              onChange={e => setCiudad(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CIUDADES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha del Boletín
            </label>
            <input
              id="fecha"
              type="date"
              value={fecha}
              max={getTodayDate()}
              onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Expediente */}
          <div>
            <label htmlFor="expediente" className="block text-sm font-medium text-gray-700 mb-1">
              Número de Expediente
            </label>
            <input
              id="expediente"
              type="text"
              value={expediente}
              onChange={e => setExpediente(e.target.value)}
              placeholder="Ej: 123/2024"
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Partes */}
          <div>
            <label htmlFor="partes" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de las Partes
            </label>
            <input
              id="partes"
              type="text"
              value={partes}
              onChange={e => setPartes(e.target.value)}
              placeholder="Ej: García López"
              maxLength={200}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={!ciudad || loading}
            className="bg-blue-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
          {meta && (
            <span className="text-sm text-gray-500">
              {meta.filteredTotal} de {meta.total} resultado(s) · Boletín: {meta.fecha}
              {meta.cached && <span className="ml-2 text-green-600">(caché)</span>}
            </span>
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-lg h-20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Results Table */}
      {!loading && results.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Expediente</th>
                  <th className="px-4 py-3 text-left font-medium">Partes</th>
                  <th className="px-4 py-3 text-left font-medium">Juzgado</th>
                  <th className="px-4 py-3 text-left font-medium">Ciudad</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Acuerdo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, idx) => (
                  <tr key={r.id ?? idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.expediente}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={r.partes}>{r.partes}</td>
                    <td className="px-4 py-3">{r.juzgado}</td>
                    <td className="px-4 py-3 capitalize">{r.ciudad}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.fecha}</td>
                    <td className="px-4 py-3 max-w-sm truncate" title={r.acuerdo}>{r.acuerdo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm text-gray-500">
                Página {meta.page} de {meta.totalPages}
                {' '}({meta.filteredTotal} resultados)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1}
                  className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                {getPaginationPageNumbers(meta.page, meta.totalPages).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`px-3 py-1 text-sm rounded border ${p === meta.page ? 'bg-blue-700 text-white border-blue-700' : 'border-gray-300 hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages}
                  className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && ciudad && results.length === 0 && meta && meta.filteredTotal === 0 && meta.total > 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron expedientes con ese filtro.
        </div>
      )}

      {!loading && !error && ciudad && meta && meta.total === 0 && (
        <div className="text-center py-12 text-gray-500">
          No hay expedientes publicados para {ciudad} en el boletín del {fecha}.
        </div>
      )}

      {!ciudad && !loading && (
        <div className="text-center py-16 text-gray-400">
          <svg className="mx-auto mb-4 h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg">Selecciona una ciudad para consultar el boletín judicial</p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-gray-400">
        Datos obtenidos del <a href="https://www.pjbc.gob.mx" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Poder Judicial de Baja California</a>.
        Actualización diaria automática.
      </footer>
    </div>
  )
}
