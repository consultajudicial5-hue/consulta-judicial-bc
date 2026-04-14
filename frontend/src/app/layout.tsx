import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Consulta Judicial BC - Boletín Judicial de Baja California',
  description: 'Consulta expedientes judiciales del Boletín Judicial de Baja California (PJBC)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
