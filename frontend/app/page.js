'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!query || query.trim().length < 2) {
      setError('Ingrese al menos 2 caracteres o el número de expediente.');
      setResults(null);
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(`${API_URL}/api/expedientes?query=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0F2C4A', color: '#fff', padding: '1.25rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Consulta Judicial BC</h1>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#precios" style={{ color: '#fff', textDecoration: 'none' }}>Precios</a>
            <a href="#como-funciona" style={{ color: '#fff', textDecoration: 'none' }}>Cómo funciona</a>
            <a href="#faq" style={{ color: '#fff', textDecoration: 'none' }}>FAQ</a>
          </nav>
        </div>
      </header>

      {/* Hero / Search */}
      <section style={{ padding: '3rem 0', backgroundColor: '#F5F7FA' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#0F2C4A', fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.25, marginTop: 0 }}>
              Encuentra tu expediente en segundos
            </h2>
            <p style={{ color: '#444', marginTop: '1rem' }}>
              Busca por número de expediente o palabra clave y recibe coincidencias con juzgado,
              materia y estatus directamente del Boletín Judicial de Baja California.
            </p>

            <form onSubmit={handleSearch} style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <input
                aria-label="Buscar expediente"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: '1px solid #ccc',
                  borderRadius: '0.375rem',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                placeholder="Ej. 123/2024 o apellidos del actor"
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: '#B8860B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1
                }}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {error && (
              <p style={{ color: '#dc2626', marginTop: '0.75rem' }}>{error}</p>
            )}

            {results && (
              <div style={{ marginTop: '1.5rem', backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '1rem' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>
                  Resultados ({results.length})
                </h3>
                {results.length === 0 ? (
                  <p style={{ color: '#666' }}>No se encontraron expedientes para "{query}".</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          {['Número', 'Juzgado', 'Materia', 'Estatus'].map((h) => (
                            <th key={h} style={{ padding: '0.5rem 0.75rem', borderBottom: '2px solid #e5e7eb', color: '#0F2C4A' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.numero} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{r.numero}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{r.juzgado}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>{r.materia}</td>
                            <td style={{ padding: '0.5rem 0.75rem' }}>
                              <span style={{
                                backgroundColor: r.estatus === 'En trámite' ? '#dbeafe' : r.estatus === 'Sentencia dictada' ? '#dcfce7' : '#f3f4f6',
                                color: r.estatus === 'En trámite' ? '#1e40af' : r.estatus === 'Sentencia dictada' ? '#166534' : '#374151',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '9999px',
                                fontSize: '0.8rem',
                                fontWeight: 500
                              }}>
                                {r.estatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontWeight: 600, color: '#0F2C4A' }}>¿Por qué usar Consulta Judicial BC?</h4>
              <ul style={{ paddingLeft: '1.25rem', color: '#555', lineHeight: 1.8 }}>
                <li>Búsqueda rápida por número de expediente o texto libre.</li>
                <li>Datos extraídos directamente del Boletín Judicial oficial del PJBC.</li>
                <li>Alertas automáticas por cambios de estatus (planes de pago).</li>
                <li>Planes para abogados independientes y despachos jurídicos.</li>
                <li>Exportación de resultados (planes Profesional y Empresarial).</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" style={{ padding: '3rem 0', backgroundColor: '#fff' }}>
        <div className="container">
          <h3 style={{ color: '#0F2C4A', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', marginTop: 0 }}>
            Planes y Precios
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
            {/* Gratis */}
            <div style={{ backgroundColor: '#F5F7FA', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gratis</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '0.5rem', color: '#0F2C4A' }}>$0</div>
              <div style={{ marginTop: '1rem', color: '#555', fontSize: '0.9rem', minHeight: '3rem' }}>Búsquedas limitadas sin registro.</div>
              <ul style={{ textAlign: 'left', padding: '0 0 0 1.25rem', color: '#555', fontSize: '0.875rem', lineHeight: 1.8 }}>
                <li>5 consultas/día</li>
                <li>Resultados básicos</li>
                <li>Sin exportación</li>
              </ul>
              <button style={{ marginTop: '1.25rem', width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                Comenzar gratis
              </button>
            </div>

            {/* Básico */}
            <div style={{ backgroundColor: '#F5F7FA', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Básico</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '0.5rem', color: '#0F2C4A' }}>$97<span style={{ fontSize: '1rem', fontWeight: 400 }}>/mes</span></div>
              <div style={{ marginTop: '1rem', color: '#555', fontSize: '0.9rem', minHeight: '3rem' }}>Más consultas y soporte básico.</div>
              <ul style={{ textAlign: 'left', padding: '0 0 0 1.25rem', color: '#555', fontSize: '0.875rem', lineHeight: 1.8 }}>
                <li>100 consultas/día</li>
                <li>Historial 30 días</li>
                <li>Soporte por email</li>
              </ul>
              <button style={{ marginTop: '1.25rem', width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#0F2C4A', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Contratar
              </button>
            </div>

            {/* Profesional (destacado) */}
            <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center', border: '4px solid #B8860B', transform: 'scale(1.04)', boxShadow: '0 4px 16px rgba(184,134,11,0.2)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B8860B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>⭐ MÁS POPULAR</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profesional</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '0.5rem', color: '#0F2C4A' }}>$197<span style={{ fontSize: '1rem', fontWeight: 400 }}>/mes</span></div>
              <div style={{ marginTop: '1rem', color: '#555', fontSize: '0.9rem', minHeight: '3rem' }}>Alertas, exportes y soporte prioritario.</div>
              <ul style={{ textAlign: 'left', padding: '0 0 0 1.25rem', color: '#555', fontSize: '0.875rem', lineHeight: 1.8 }}>
                <li>Consultas ilimitadas</li>
                <li>Alertas de cambio de estatus</li>
                <li>Exportación CSV/PDF</li>
                <li>Soporte prioritario</li>
              </ul>
              <button style={{ marginTop: '1.25rem', width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#B8860B', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Elegir Profesional
              </button>
            </div>

            {/* Empresarial */}
            <div style={{ backgroundColor: '#F5F7FA', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Empresarial</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '0.5rem', color: '#0F2C4A' }}>$497<span style={{ fontSize: '1rem', fontWeight: 400 }}>/mes</span></div>
              <div style={{ marginTop: '1rem', color: '#555', fontSize: '0.9rem', minHeight: '3rem' }}>Soporte dedicado, SLA garantizado y API.</div>
              <ul style={{ textAlign: 'left', padding: '0 0 0 1.25rem', color: '#555', fontSize: '0.875rem', lineHeight: 1.8 }}>
                <li>API REST dedicada</li>
                <li>SLA 99.9% uptime</li>
                <li>Múltiples usuarios</li>
                <li>Soporte 24/7</li>
              </ul>
              <button style={{ marginTop: '1.25rem', width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #0F2C4A', backgroundColor: '#fff', color: '#0F2C4A', cursor: 'pointer', fontWeight: 600 }}>
                Contactar ventas
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" style={{ padding: '3rem 0', backgroundColor: '#F5F7FA' }}>
        <div className="container">
          <h3 style={{ color: '#0F2C4A', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', marginTop: 0 }}>
            Cómo funciona
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { step: '1', title: 'Ingresa tu búsqueda', desc: 'Escribe el número de expediente, nombre de las partes o cualquier palabra clave.' },
              { step: '2', title: 'Consultamos el Boletín', desc: 'El sistema consulta directamente el Boletín Judicial oficial del Poder Judicial de Baja California.' },
              { step: '3', title: 'Recibe los resultados', desc: 'Obtén número, juzgado, materia, estatus y acuerdos del expediente en segundos.' }
            ].map((item) => (
              <div key={item.step} style={{ backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: '#0F2C4A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
                  {item.step}
                </div>
                <h4 style={{ margin: '0 0 0.5rem', color: '#0F2C4A', fontWeight: 600 }}>{item.title}</h4>
                <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '3rem 0', backgroundColor: '#fff' }}>
        <div className="container">
          <h3 style={{ color: '#0F2C4A', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', marginTop: 0 }}>
            Preguntas Frecuentes
          </h3>
          <div style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { q: '¿De dónde provienen los datos?', a: 'Los datos se extraen directamente del Boletín Judicial oficial del Poder Judicial de Baja California (PJBC).' },
              { q: '¿Con qué frecuencia se actualizan los datos?', a: 'El sistema consulta el boletín en tiempo real en cada búsqueda. Los datos reflejan la información publicada oficialmente.' },
              { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de usuario sin penalizaciones.' },
              { q: '¿Es legal usar este servicio?', a: 'Sí. Consultamos información pública oficial disponible en el sitio web del PJBC.' }
            ].map((item, i) => (
              <div key={i} style={{ backgroundColor: '#F5F7FA', borderRadius: '0.5rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
                <h5 style={{ margin: '0 0 0.5rem', color: '#0F2C4A', fontWeight: 600 }}>{item.q}</h5>
                <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem 0', borderTop: '1px solid #e5e7eb', backgroundColor: '#F5F7FA' }}>
        <div className="container" style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
          © {new Date().getFullYear()} Consulta Judicial BC — Hecho con ♡ para profesionales del Derecho en Baja California.
        </div>
      </footer>
    </div>
  );
}
