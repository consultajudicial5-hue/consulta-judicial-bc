'use client';

interface AnalysisResult {
  diagnostico: string;
  riesgo: 'alto' | 'medio' | 'bajo';
  acciones: string[];
}

interface AnalysisModalProps {
  acuerdo: string;
  analysis: AnalysisResult | null;
  loading: boolean;
  onClose: () => void;
}

const RIESGO_CONFIG = {
  alto: { label: 'RIESGO ALTO', className: 'bg-red-100 text-red-800 border border-red-300' },
  medio: { label: 'RIESGO MEDIO', className: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
  bajo: { label: 'RIESGO BAJO', className: 'bg-green-100 text-green-800 border border-green-300' },
};

export default function AnalysisModal({ acuerdo, analysis, loading, onClose }: AnalysisModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">🧠 Análisis de IA</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Acuerdo Text */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Texto del Acuerdo
            </h3>
            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
              {acuerdo}
            </div>
          </div>

          {/* Analysis */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-gray-500">Analizando acuerdo...</span>
            </div>
          )}

          {!loading && analysis && (
            <>
              {/* Risk Badge */}
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    RIESGO_CONFIG[analysis.riesgo].className
                  }`}
                >
                  {analysis.riesgo === 'alto' && '🔴 '}
                  {analysis.riesgo === 'medio' && '🟡 '}
                  {analysis.riesgo === 'bajo' && '🟢 '}
                  {RIESGO_CONFIG[analysis.riesgo].label}
                </span>
              </div>

              {/* Diagnóstico */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Diagnóstico
                </h3>
                <p className="text-gray-800 leading-relaxed">{analysis.diagnostico}</p>
              </div>

              {/* Acciones */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Acciones Recomendadas
                </h3>
                <ul className="space-y-2">
                  {analysis.acciones.map((accion, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="mt-0.5 text-secondary font-bold flex-shrink-0">✓</span>
                      <span>{accion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-gray-400 pt-2 border-t">
                * Este análisis es orientativo y no reemplaza el asesoramiento de un abogado profesional.
              </p>
            </>
          )}
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
