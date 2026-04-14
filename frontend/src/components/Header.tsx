'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Buscar' },
  { href: '/monitor', label: 'Monitor' },
  { href: '/remates', label: 'Remates' },
  { href: '/documentos', label: 'Analizador de Demandas' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-primary shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <span>⚖️</span>
            <span>Consulta Judicial BC</span>
            <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
              BETA
            </span>
          </Link>
          <nav className="hidden sm:flex gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-white text-primary'
                    : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          {/* Mobile nav */}
          <nav className="sm:hidden flex gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  pathname === href ? 'bg-white text-primary' : 'text-blue-100'
                }`}
              >
                {label.split(' ')[0]}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
