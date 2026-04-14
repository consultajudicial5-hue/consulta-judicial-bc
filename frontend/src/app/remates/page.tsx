'use client';

import { useState, useEffect } from 'react';

interface Remate {
  expediente: string;
  juzgado: string;
  ciudad: string;
  fecha: string;
  texto: string;
  tipo: 'remate' | 'subasta' | 'adjudicación';
}

const TIPO_CONFIG = {
  remate: { label: 'Remate', className: 'bg-red-100 text-red-700' },
  subasta: { label: 'Subasta', className: 'bg-orange-100 text-orange-700' },
  adjudicación: { label: 'Adjudicación', className: 'bg-purple-100 text-purple-700' },
};

export default function RematesPage() {
  const [remates, setRemates] = useState<Remate[]>([]);
  const [loading, setLoading] = useState(false);
  const [ciudad, setCiudad] = useState('');
  const [error, setError] = useState('');

  const CITIES = ['Tijuana', 'Mexicali', 'Ensenada', 'Tecate', 'Rosarito'];

  const fetchRemates = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (ciudad) params.set('ciudad', ciudad);
      const res = await fetch(`/api/remates?${params.toString()}`);
      if (!res.ok) throw new Error('Error al obtener remates');
      const data = await res.json();
      setRemates(data.remates || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🏛️ Remates y Subastas Judiciales</h1>
        <p className="text-gray-500 mt-1">
          Consulta los remates, subastas y adjudicaciones publicados en el boletín de los últimos 7 días.
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Ciudad</label>
            <select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas las ciudades</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchRemates}
            disabled={loading}
            className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            )}
            {loading ? 'Buscando...' : '🔍 Buscar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : remates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
          <div className="text-5xl mb-4">🔨</div>
          <p className="text-lg font-medium">No se encontraron remates</p>
          <p className="text-sm mt-1">
            No hay remates, subastas o adjudicaciones publicados en los últimos 7 días del boletín.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700">
              {remates.length} resultado{remates.length !== 1 ? 's' : ''} encontrado{remates.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Tipo', 'Expediente', 'Juzgado', 'Ciudad', 'Fecha', 'Resumen'].map((h) => (
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
                {remates.map((r, i) => {
                  const tipoConfig = TIPO_CONFIG[r.tipo] ?? TIPO_CONFIG['remate'];
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${tipoConfig.className}`}>
                          {tipoConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 whitespace-nowrap">
                        {r.expediente}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.juzgado}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.ciudad}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.fecha}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                        <p className="line-clamp-2">{r.texto}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
