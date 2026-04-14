'use client';

import { useState, useRef } from 'react';

interface AnalysisResult {
  diagnostico: string;
  riesgo: 'alto' | 'medio' | 'bajo';
  acciones: string[];
}

interface RevisionRedaccion {
  faltantes: string[];
  sugerencias: string[];
}

interface DocumentAnalysis {
  nombre_archivo: string;
  caracteres_extraidos: number;
  analisis: AnalysisResult;
  revision_redaccion: RevisionRedaccion;
}

const RIESGO_CONFIG = {
  alto: { label: 'RIESGO ALTO', className: 'bg-red-100 text-red-800 border border-red-300', icon: '🔴' },
  medio: { label: 'RIESGO MEDIO', className: 'bg-yellow-100 text-yellow-800 border border-yellow-300', icon: '🟡' },
  bajo: { label: 'RIESGO BAJO', className: 'bg-green-100 text-green-800 border border-green-300', icon: '🟢' },
};

export default function DocumentosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DocumentAnalysis | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.type === 'application/pdf' || dropped.name.endsWith('.txt'))) {
      setFile(dropped);
      setResult(null);
      setError('');
    } else {
      setError('Solo se aceptan archivos PDF o TXT.');
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Seleccione un archivo para analizar.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents/analyze', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al analizar el documento');
      }
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📄 Analizador de Documentos Legales</h1>
        <p className="text-gray-500 mt-1">
          Sube una demanda, escrito o acuerdo en PDF o TXT para obtener análisis de riesgo y revisión de redacción.
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-colors"
        >
          <div className="text-5xl mb-3">📁</div>
          {file ? (
            <div>
              <p className="text-lg font-medium text-gray-800">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 font-medium">Arrastra tu documento aquí</p>
              <p className="text-gray-400 text-sm mt-1">o haz clic para seleccionar (PDF o TXT)</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="mt-4 w-full bg-primary text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          )}
          {loading ? 'Analizando documento...' : '🧠 Analizar Documento'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3 text-sm text-gray-600">
            <span className="text-2xl">📄</span>
            <div>
              <p className="font-medium text-gray-800">{result.nombre_archivo}</p>
              <p>{result.caracteres_extraidos.toLocaleString()} caracteres extraídos</p>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🧠 Análisis de IA</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold gap-1 ${
                    RIESGO_CONFIG[result.analisis.riesgo].className
                  }`}
                >
                  {RIESGO_CONFIG[result.analisis.riesgo].icon}{' '}
                  {RIESGO_CONFIG[result.analisis.riesgo].label}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Diagnóstico
                </h3>
                <p className="text-gray-800 leading-relaxed">{result.analisis.diagnostico}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Acciones Recomendadas
                </h3>
                <ul className="space-y-2">
                  {result.analisis.acciones.map((accion, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-secondary font-bold mt-0.5 flex-shrink-0">✓</span>
                      <span>{accion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Document Review */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📝 Revisión de Redacción</h2>

            {result.revision_redaccion.faltantes.length > 0 ? (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-2">
                  Elementos Faltantes
                </h3>
                <ul className="space-y-1">
                  {result.revision_redaccion.faltantes.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-red-700 text-sm">
                      <span className="font-bold mt-0.5 flex-shrink-0">✗</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 text-green-700 text-sm">
                <span>✓</span>
                <span>El documento contiene todos los elementos esenciales identificados.</span>
              </div>
            )}

            {result.revision_redaccion.sugerencias.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-2">
                  Sugerencias de Mejora
                </h3>
                <ul className="space-y-1">
                  {result.revision_redaccion.sugerencias.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-yellow-800 text-sm">
                      <span className="font-bold mt-0.5 flex-shrink-0">💡</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">
            * Este análisis es orientativo y no reemplaza el asesoramiento de un abogado profesional.
          </p>
        </div>
      )}
    </div>
  );
}
