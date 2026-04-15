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
  semaforo?: 'rojo' | 'amarillo' | 'verde'
}

interface SearchResponse {
  results: Expediente[]
  total: number
  cached: boolean
  fecha: string
  error?: string
}

const CIUDADES = [
  { value: '', label: '— Selecciona una ciudad —' },
  { value: 'mexicali', label: 'Mexicali' },
  { value: 'tijuana', label: 'Tijuana' },
  { value: 'ensenada', label: 'Ensenada' },
  { value: 'tecate', label: 'Tecate' },
  { value: 'rosarito', label: 'Rosarito' },
]

const SEMAFORO_COLORS = {
  rojo: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Urgente' },
  amarillo: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Atención' },
  verde: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Informativo' },
}

function SemaforoBadge({ semaforo }: { semaforo?: 'rojo' | 'amarillo' | 'verde' }) {
  const s = semaforo ?? 'verde'
  const c = SEMAFORO_COLORS[s]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

export default function HomePage() {
  const [ciudad, setCiudad] = useState('')
  const [expediente, setExpediente] = useState('')
  const [partes, setPartes] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Expediente[]>([])
  const [filteredResults, setFilteredResults] = useState<Expediente[]>([])
  const [meta, setMeta] = useState<{ total: number; cached: boolean; fecha: string } | null>(null)
  const [error, setError] = useState('')
  const [monitorMsg, setMonitorMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [subscribeLoading, setSubscribeLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Check for ?subscribed=1 in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscribed') === '1') {
      setSuccessMsg('¡Suscripción Premium activada! Ya puedes usar todas las funciones.')
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const search = useCallback(async (params: { ciudad: string; expediente?: string; partes?: string }) => {
    if (!params.ciudad) return
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (params.ciudad) qs.set('ciudad', params.ciudad)
      if (params.expediente) qs.set('expediente', params.expediente)
      if (params.partes) qs.set('partes', params.partes)

      const res = await fetch(`/api/search?${qs.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Error ${res.status}`)
      }
      const data: SearchResponse = await res.json()
      setResults(data.results)
      setFilteredResults(data.results)
      setMeta({ total: data.total, cached: data.cached, fecha: data.fecha })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      setResults([])
      setFilteredResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-search when city changes
  useEffect(() => {
    if (ciudad) {
      search({ ciudad, expediente: expediente || undefined, partes: partes || undefined })
    } else {
      setResults([])
      setFilteredResults([])
      setMeta(null)
    }
  }, [ciudad, search])

  // Real-time filter on expediente / partes (client-side)
  useEffect(() => {
    if (!results.length) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const expLower = expediente.toLowerCase().trim()
      const partesLower = partes.toLowerCase().trim()
      const filtered = results.filter(r => {
        const matchExp = expLower ? r.expediente.toLowerCase().includes(expLower) : true
        const matchPartes = partesLower ? r.partes.toLowerCase().includes(partesLower) : true
        return matchExp && matchPartes
      })
      setFilteredResults(filtered)
    }, 200)
  }, [expediente, partes, results])

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    search({ ciudad, expediente: expediente || undefined, partes: partes || undefined })
  }

  const handleMonitor = async (exp: Expediente) => {
    if (!email) {
      setMonitorMsg({ text: 'Ingresa tu email para monitorear este expediente.', ok: false })
      return
    }
    try {
      const res = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, expediente: exp.expediente, ciudad: exp.ciudad }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.premium_required) {
          setMonitorMsg({ text: 'Límite gratuito alcanzado. Actualiza a Premium para monitoreo ilimitado.', ok: false })
        } else {
          setMonitorMsg({ text: data.error ?? 'Error al guardar.', ok: false })
        }
      } else {
        setMonitorMsg({ text: data.message ?? 'Expediente en monitoreo.', ok: true })
      }
    } catch {
      setMonitorMsg({ text: 'Error de conexión.', ok: false })
    }
    setTimeout(() => setMonitorMsg(null), 5000)
  }

  const handleSubscribe = async () => {
    if (!email) {
      setMonitorMsg({ text: 'Ingresa tu email para suscribirte.', ok: false })
      return
    }
    setSubscribeLoading(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMonitorMsg({ text: data.error ?? 'Error al iniciar pago.', ok: false })
      }
    } catch {
      setMonitorMsg({ text: 'Error de conexión con el servicio de pagos.', ok: false })
    } finally {
      setSubscribeLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-800">Monitor Judicial BC</h1>
        <p className="text-gray-600 mt-1">Boletín Judicial del Poder Judicial de Baja California</p>
      </header>

      {/* Success banner */}
      {successMsg && (
        <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg px-4 py-3 mb-6 text-center font-medium">
          🎉 {successMsg}
        </div>
      )}

      {/* Premium banner */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <p className="font-semibold">🚀 Plan Premium — $299 MXN/mes</p>
          <p className="text-blue-200 text-sm">Búsqueda por nombre · Monitoreo ilimitado · Alertas en tiempo real</p>
        </div>
        <button
          onClick={handleSubscribe}
          disabled={subscribeLoading}
          className="shrink-0 bg-white text-blue-800 font-bold px-5 py-2 rounded-lg hover:bg-blue-50 disabled:opacity-60 transition-colors text-sm"
        >
          {subscribeLoading ? 'Redirigiendo…' : 'Actualizar a Premium'}
        </button>
      </div>

      {/* Email input (for monitoring & premium) */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex items-center gap-3">
        <label htmlFor="email" className="text-sm font-medium text-gray-700 shrink-0">Tu email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          maxLength={200}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">Para monitoreo y alertas</span>
      </div>

      {/* Search Form */}
      <form onSubmit={handleManualSearch} className="bg-white rounded-xl shadow p-6 mb-6" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Expediente */}
          <div>
            <label htmlFor="expediente" className="block text-sm font-medium text-gray-700 mb-1">
              Número de Expediente <span className="text-gray-400 text-xs">(gratis)</span>
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
              Nombre de las Partes <span className="text-blue-600 text-xs font-semibold">(Premium)</span>
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
              {filteredResults.length} de {meta.total} resultado(s) · Boletín: {meta.fecha}
              {meta.cached && <span className="ml-2 text-green-600">(caché)</span>}
            </span>
          )}
        </div>
      </form>

      {/* Notifications */}
      {monitorMsg && (
        <div role="alert" className={`rounded-lg px-4 py-3 mb-4 ${monitorMsg.ok ? 'bg-green-50 border border-green-300 text-green-700' : 'bg-amber-50 border border-amber-300 text-amber-700'}`}>
          {monitorMsg.text}
        </div>
      )}

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
      {!loading && filteredResults.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-700 text-white">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Estado</th>
                  <th className="px-3 py-3 text-left font-medium">Expediente</th>
                  <th className="px-3 py-3 text-left font-medium">Partes</th>
                  <th className="px-3 py-3 text-left font-medium">Juzgado</th>
                  <th className="px-3 py-3 text-left font-medium">Ciudad</th>
                  <th className="px-3 py-3 text-left font-medium">Fecha</th>
                  <th className="px-3 py-3 text-left font-medium">Acuerdo</th>
                  <th className="px-3 py-3 text-left font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResults.map((r, idx) => (
                  <tr key={r.id ?? idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <SemaforoBadge semaforo={r.semaforo} />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">{r.expediente}</td>
                    <td className="px-3 py-3 max-w-xs truncate" title={r.partes}>{r.partes}</td>
                    <td className="px-3 py-3">{r.juzgado}</td>
                    <td className="px-3 py-3 capitalize">{r.ciudad}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{r.fecha}</td>
                    <td className="px-3 py-3 max-w-sm truncate" title={r.acuerdo}>{r.acuerdo}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleMonitor(r)}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                        title="Monitorear este expediente"
                      >
                        📡 Monitorear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && ciudad && filteredResults.length === 0 && results.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron expedientes con ese filtro.
        </div>
      )}

      {!loading && !error && ciudad && results.length === 0 && meta && (
        <div className="text-center py-12 text-gray-500">
          No hay expedientes publicados para {ciudad} en el boletín de hoy.
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

      {/* Semáforo legend */}
      <div className="mt-8 bg-white rounded-xl shadow p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Leyenda del semáforo:</p>
        <div className="flex flex-wrap gap-4">
          {(Object.entries(SEMAFORO_COLORS) as [keyof typeof SEMAFORO_COLORS, typeof SEMAFORO_COLORS.rojo][]).map(([key, c]) => (
            <span key={key} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${c.bg} ${c.text}`}>
              <span className={`w-3 h-3 rounded-full ${c.dot}`} />
              <strong>{c.label}</strong>
              {key === 'rojo' && '— Emplazamiento, requerimiento o embargo'}
              {key === 'amarillo' && '— Admisión, acuerdo o señalamiento'}
              {key === 'verde' && '— Informativo o trámite rutinario'}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-400">
        Datos obtenidos del{' '}
        <a href="https://www.pjbc.gob.mx" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
          Poder Judicial de Baja California
        </a>.
        Actualización diaria automática.
      </footer>
    </div>
  )
}
