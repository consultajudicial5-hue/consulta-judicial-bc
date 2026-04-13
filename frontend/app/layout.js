import './globals.css';

export const metadata = {
  title: 'Consulta Judicial BC',
  description: 'Busca expedientes judiciales de Baja California rápidamente.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.0/dist/tailwind.min.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen" style={{ backgroundColor: 'var(--judicial-bg)' }}>
        <main>{children}</main>
      </body>
    </html>
  );
}
