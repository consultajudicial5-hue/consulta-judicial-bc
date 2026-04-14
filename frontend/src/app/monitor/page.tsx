'use client';

import { useState, useEffect } from 'react';

interface MonitoredExpediente {
  id: string;
  ciudad: string;
  juzgado: string;
  expediente: string;
  email: string;
  whatsapp: string;
  ultimo_acuerdo: string;
  ultima_revision: string;
  activo: boolean;
}

interface Change {
  expediente: string;
  ciudad: string;
  juzgado: string;
  nuevo_acuerdo: string;
  acuerdo_anterior: string;
  fecha_revision: string;
}

type CitiesMap = Record<string, string[]>;

export default function MonitorPage() {
  const [cities, setCities] = useState<CitiesMap>({});
  const [expedientes, setExpedientes] = useState<MonitoredExpediente[]>([]);
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    ciudad: '',
    juzgado: '',
    expediente: '',
    email: '',
  });

  const juzgados = form.ciudad ? cities[form.ciudad] ?? [] : [];

  useEffect(() => {
    fetch('/api/cities').then((r) => r.json()).then(setCities).catch(() => {});
    loadExpedientes();
  }, []);

  const loadExpedientes = async () => {
    try {
      const res = await fetch('/api/monitor');
      const data = await res.json();
      setExpedientes(data.expedientes || []);
    } catch {
      setExpedientes([]);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.expediente.trim()) {
      setError('El número de expediente es requerido.');
      return;
    }
    setAddLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al agregar');
      }
      setSuccessMsg('Expediente agregado al monitor correctamente.');
      setForm({ ciudad: '', juzgado: '', expediente: '', email: '' });
      loadExpedientes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este expediente del monitor?')) return;
    try {
      await fetch(`/api/monitor/${id}`, { method: 'DELETE' });
      loadExpedientes();
    } catch {
      setError('No se pudo eliminar el expediente.');
    }
  };

  const handleCheck = async () => {
    setCheckLoading(true);
    setChanges(null);
    setError('');
    try {
      const res = await fetch('/api/monitor/check', { method: 'POST' });
      const data = await res.json();
      setChanges(data.cambios || []);
    } catch {
      setError('Error al verificar expedientes.');
    } finally {
      setCheckLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🔔 Monitor de Expedientes</h1>
        <p className="text-gray-500 mt-1">
          Monitorea tus expedientes automáticamente. Recibirás alertas cuando haya nuevos acuerdos.
        </p>
      </div>

      {/* Add Form */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Agregar Expediente al Monitor</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {successMsg}
          </div>
        )}
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <select
                value={form.ciudad}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value, juzgado: '' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleccionar ciudad</option>
                {Object.keys(cities).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Juzgado</label>
              <select
                value={form.juzgado}
                onChange={(e) => setForm({ ...form, juzgado: e.target.value })}
                disabled={!form.ciudad}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              >
                <option value="">Seleccionar juzgado</option>
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
                value={form.expediente}
                onChange={(e) => setForm({ ...form, expediente: e.target.value })}
                placeholder="Ej. 123/2024"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (opcional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={addLoading}
            className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {addLoading ? 'Agregando...' : '➕ Agregar al Monitor'}
          </button>
        </form>
      </div>

      {/* Check Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Expedientes Monitoreados ({expedientes.length})
        </h2>
        <button
          onClick={handleCheck}
          disabled={checkLoading || expedientes.length === 0}
          className="bg-secondary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {checkLoading && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          )}
          {checkLoading ? 'Verificando...' : '🔄 Verificar Ahora'}
        </button>
      </div>

      {/* Changes */}
      {changes !== null && (
        <div className={`rounded-xl p-4 mb-6 ${changes.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
          {changes.length === 0 ? (
            <p className="text-green-700 font-medium">✓ Sin cambios detectados en los expedientes monitoreados.</p>
          ) : (
            <>
              <p className="text-yellow-800 font-semibold mb-3">⚠️ {changes.length} cambio(s) detectado(s):</p>
              <div className="space-y-3">
                {changes.map((c, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-yellow-200">
                    <div className="font-medium text-gray-800">
                      Exp. {c.expediente} — {c.juzgado}, {c.ciudad}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      <strong>Nuevo acuerdo:</strong> {c.nuevo_acuerdo.substring(0, 200)}...
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{c.fecha_revision}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Expedientes Table */}
      {expedientes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
          <div className="text-5xl mb-4">👁️</div>
          <p className="text-lg font-medium">No hay expedientes monitoreados</p>
          <p className="text-sm mt-1">Agrega un expediente para recibir alertas automáticas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Expediente', 'Juzgado', 'Ciudad', 'Email', 'Última Revisión', 'Último Acuerdo', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {expedientes.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{exp.expediente}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{exp.juzgado || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{exp.ciudad || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{exp.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{exp.ultima_revision}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                      <p className="line-clamp-1">{exp.ultimo_acuerdo || 'Sin acuerdo registrado'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="text-danger hover:text-red-700 text-xs font-medium transition-colors"
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
