'use client';

import { useState, useEffect } from 'react';
import AnalysisModal from '@/components/AnalysisModal';

interface SearchResult {
  expediente: string;
  juzgado: string;
  ciudad: string;
  fecha: string;
  acuerdo: string;
}

interface AnalysisResult {
  diagnostico: string;
  riesgo: 'alto' | 'medio' | 'bajo';
  acciones: string[];
}

type CitiesMap = Record<string, string[]>;

export default function HomePage() {
  const [cities, setCities] = useState<CitiesMap>({});
  const [ciudad, setCiudad] = useState('');
  const [juzgado, setJuzgado] = useState('');
  const [expediente, setExpediente] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAcuerdo, setSelectedAcuerdo] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    fetch('/api/cities')
      .then((r) => r.json())
      .then((data) => setCities(data))
      .catch(() => {});
  }, []);

  const juzgados = ciudad ? cities[ciudad] ?? [] : [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expediente.trim()) {
      setError('Por favor ingrese el número de expediente.');
      return;
    }
    setLoading(true);
    setError('');
    setResults(null);
    setSearched(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciudad, juzgado, expediente }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al buscar');
      }
      const data = await res.json();
      setResults(data.results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (acuerdo: string) => {
    setSelectedAcuerdo(acuerdo);
    setAnalysis(null);
    setModalOpen(true);
    setAnalysisLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: acuerdo }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch {
      setAnalysis({
        diagnostico: 'No se pudo conectar al servidor de análisis.',
        riesgo: 'bajo',
        acciones: ['Intente de nuevo más tarde.'],
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
          El boletín judicial de BC,{' '}
          <span className="text-primary">analizado por IA</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Busca tu expediente en los últimos 7 días del boletín del Poder Judicial de Baja California
          y obtén un análisis inteligente de cada acuerdo.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <select
                value={ciudad}
                onChange={(e) => { setCiudad(e.target.value); setJuzgado(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todas las ciudades</option>
                {Object.keys(cities).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Juzgado</label>
              <select
                value={juzgado}
                onChange={(e) => setJuzgado(e.target.value)}
                disabled={!ciudad}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Todos los juzgados</option>
                {juzgados.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Expediente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={expediente}
                onChange={(e) => setExpediente(e.target.value)}
                placeholder="Ej. 123/2024"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-primary text-white px-8 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? 'Buscando...' : '🔍 Buscar en el Boletín'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && results !== null && (
        <>
          {results.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-lg font-medium">No se encontraron resultados</p>
              <p className="text-sm mt-1">
                No se encontraron resultados para este expediente en los últimos 7 días del boletín.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-700">
                  {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Expediente', 'Juzgado', 'Ciudad', 'Fecha', 'Resumen del Acuerdo', 'Acción'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 whitespace-nowrap">
                          {r.expediente}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.juzgado}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.ciudad}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.fecha}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                          <p className="line-clamp-2 leading-relaxed">{r.acuerdo}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleAnalyze(r.acuerdo)}
                            className="bg-secondary text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            🧠 Analizar con IA
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <AnalysisModal
          acuerdo={selectedAcuerdo}
          analysis={analysis}
          loading={analysisLoading}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
