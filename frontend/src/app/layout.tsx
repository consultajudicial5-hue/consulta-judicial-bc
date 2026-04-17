import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Consulta Judicial BC – Buscador del Boletín Judicial',
  description: 'Consulta expedientes judiciales del Boletín Judicial de Baja California (PJBC), analiza acuerdos con IA y monitorea tu expediente.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="bg-gray-800 text-gray-300 text-center py-4 text-sm">
          <p>
            © {new Date().getFullYear()} Consulta Judicial BC · Datos del{' '}
            <a
              href="https://www.pjbc.gob.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Poder Judicial de Baja California
            </a>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Este sitio es una herramienta de consulta independiente. No reemplaza el asesoramiento legal profesional.
          </p>
        </footer>
      </body>
    </html>
  )
}
