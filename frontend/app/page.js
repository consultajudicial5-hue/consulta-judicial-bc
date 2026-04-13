'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PRIMARY = '#0F2C4A';
const SECONDARY = '#B8860B';
const BG = '#F5F7FA';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError('Ingrese al menos 2 caracteres o el número de expediente.');
      setResults(null);
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(
        `${API_URL}/api/expedientes?query=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ backgroundColor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ backgroundColor: PRIMARY, color: '#fff', padding: '1.25rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
            ⚖️ Consulta Judicial BC
          </h1>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#precios" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.95rem' }}>Precios</a>
            <a href="#como-funciona" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.95rem' }}>Cómo funciona</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: '4rem 0 2rem' }}>
        <div className="container">
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ color: PRIMARY, fontSize: '2.2rem', fontWeight: 800, margin: '0 0 1rem' }}>
              Encuentra tu expediente judicial en segundos
            </h2>
            <p style={{ color: '#4B5563', fontSize: '1.1rem', margin: '0 0 2rem' }}>
              Consulta expedientes del Poder Judicial de Baja California.
              Busca por número de expediente, nombre o juzgado.
            </p>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                aria-label="Buscar expediente"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  flex: '1 1 300px',
                  padding: '0.85rem 1.25rem',
                  border: `2px solid ${PRIMARY}`,
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                placeholder="Ej. 123/2024 o nombre del actor"
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.85rem 2rem',
                  backgroundColor: SECONDARY,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1
                }}
              >
                {loading ? 'Buscando...' : '🔍 Buscar'}
              </button>
            </form>

            {error && (
              <p style={{ color: '#DC2626', marginTop: '1rem', fontWeight: 500 }}>{error}</p>
            )}
          </div>

          {/* Results */}
          {results && (
            <div style={{
              marginTop: '2rem',
              backgroundColor: '#fff',
              borderRadius: '0.75rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              padding: '1.5rem',
              overflowX: 'auto'
            }}>
              <h3 style={{ color: PRIMARY, margin: '0 0 1rem', fontWeight: 700 }}>
                Resultados ({results.length})
              </h3>
              {results.length === 0 ? (
                <p style={{ color: '#6B7280' }}>No se encontraron expedientes con ese criterio.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: PRIMARY, color: '#fff' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Número</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Juzgado</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Materia</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.numero} style={{ backgroundColor: i % 2 === 0 ? '#F9FAFB' : '#fff', borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: PRIMARY }}>{r.numero}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{r.juzgado}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{r.materia}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            backgroundColor: r.estatus === 'En trámite' ? '#DCFCE7' : r.estatus === 'Archivado' ? '#F3F4F6' : '#FEF3C7',
                            color: r.estatus === 'En trámite' ? '#166534' : r.estatus === 'Archivado' ? '#374151' : '#92400E',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}>
                            {r.estatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" style={{ padding: '3rem 0', backgroundColor: '#fff' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h3 style={{ color: PRIMARY, fontSize: '1.75rem', fontWeight: 800, marginBottom: '2rem' }}>
            ¿Cómo funciona?
          </h3>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: '🔍', title: 'Ingresa tu búsqueda', desc: 'Escribe el número de expediente, nombre o juzgado.' },
              { icon: '⚡', title: 'Consulta en tiempo real', desc: 'El sistema busca en el Boletín Judicial Oficial de Baja California.' },
              { icon: '📄', title: 'Obtén resultados', desc: 'Visualiza número, juzgado, materia y estatus al instante.' }
            ].map((step) => (
              <div key={step.title} style={{ flex: '1 1 220px', maxWidth: 260 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{step.icon}</div>
                <h4 style={{ color: PRIMARY, fontWeight: 700, margin: '0 0 0.5rem' }}>{step.title}</h4>
                <p style={{ color: '#6B7280', margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" style={{ padding: '3rem 0' }}>
        <div className="container">
          <h3 style={{ color: PRIMARY, fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '2rem' }}>
            Planes y Precios
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {/* Gratis */}
            <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gratis</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: PRIMARY, margin: '0.75rem 0' }}>$0</div>
              <div style={{ color: '#6B7280', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                <p style={{ margin: '0.4rem 0' }}>✓ 5 búsquedas por día</p>
                <p style={{ margin: '0.4rem 0' }}>✓ Resultados básicos</p>
                <p style={{ margin: '0.4rem 0' }}>✗ Sin alertas</p>
              </div>
              <button style={{ width: '100%', padding: '0.75rem', backgroundColor: '#F3F4F6', color: PRIMARY, border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                Comenzar gratis
              </button>
            </div>

            {/* Básico */}
            <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Básico</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: PRIMARY, margin: '0.75rem 0' }}>
                $97<span style={{ fontSize: '1rem', fontWeight: 400 }}>/mes</span>
              </div>
              <div style={{ color: '#6B7280', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                <p style={{ margin: '0.4rem 0' }}>✓ 100 búsquedas por día</p>
                <p style={{ margin: '0.4rem 0' }}>✓ Historial 30 días</p>
                <p style={{ margin: '0.4rem 0' }}>✓ Soporte por correo</p>
              </div>
              <button style={{ width: '100%', padding: '0.75rem', backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                Contratar Básico
              </button>
            </div>

            {/* Profesional (destacado) */}
            <div style={{ backgroundColor: PRIMARY, borderRadius: '0.75rem', boxShadow: `0 4px 20px rgba(184,134,11,0.3)`, padding: '2rem', textAlign: 'center', border: `3px solid ${SECONDARY}`, transform: 'scale(1.04)' }}>
              <div style={{ fontSize: '0.75rem', backgroundColor: SECONDARY, color: '#fff', display: 'inline-block', padding: '0.2rem 0.75rem', borderRadius: '9999px', fontWeight: 700, marginBottom: '0.5rem' }}>⭐ MÁS POPULAR</div>
              <div style={{ fontSize: '0.85rem', color: '#CBD5E1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profesional</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', margin: '0.75rem 0' }}>
                $197<span style={{ fontSize: '1rem', fontWeight: 400 }}>/mes</span>
              </div>
              <div style={{ color: '#CBD5E1', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                <p style={{ margin: '0.4rem 0' }}>✓ Búsquedas ilimitadas</p>
                <p style={{ margin: '0.4rem 0' }}>✓ Alertas automáticas</p>
                <p style={{ margin: '0.4rem 0' }}>✓ Exportar a PDF/Excel</p>
                <p style={{ margin: '0.4rem 0' }}>✓ Soporte prioritario</p>
              </div>
              <button style={{ width: '100%', padding: '0.75rem', backgroundColor: SECONDARY, color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                Elegir Profesional
              </button>
            </div>

            {/* Empresarial */}
            <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Empresarial</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: PRIMARY, margin: '0.75rem 0' }}>
                $497<span style={{ fontSize: '1rem', fontWeight: 400 }}>/mes</span>
              </div>
              <div style={{ color: '#6B7280', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                <p style={{ margin: '0.4rem 0' }}>✓ Todo lo del Profesional</p>
                <p style={{ margin: '0.4rem 0' }}>✓ API dedicada</p>
                <p style={{ margin: '0.4rem 0' }}>✓ SLA garantizado</p>
                <p style={{ margin: '0.4rem 0' }}>✓ Gestor de cuenta</p>
              </div>
              <button style={{ width: '100%', padding: '0.75rem', backgroundColor: '#F3F4F6', color: PRIMARY, border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                Contactar ventas
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2.5rem 0', borderTop: '1px solid #E5E7EB', marginTop: '2rem' }}>
        <div className="container" style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.9rem' }}>
          © {new Date().getFullYear()} Consulta Judicial BC — Hecho para profesionales del Derecho en Baja California.
        </div>
      </footer>
    </div>
  );
}
