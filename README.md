# Consulta Judicial BC

Sistema de consulta del Boletín Judicial del Poder Judicial de Baja California (PJBC).

## Tecnologías

- **Frontend + Backend**: Next.js 15 (App Router) + TypeScript
- **Estilos**: Tailwind CSS 3
- **Scraper**: Node.js (Cheerio) + Python (stdlib)
- **Base de datos**: Supabase (PostgreSQL)
- **Seguridad**: Zod (validación), rate limiting, headers de seguridad

## Instalación

```bash
# 1. Entra al directorio frontend
cd frontend

# 2. Instala dependencias
npm install

# 3. Configura variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

# 4. Crea las tablas en Supabase
# Ejecuta el contenido de supabase/migrations/001_initial_schema.sql
# en el SQL Editor de tu proyecto de Supabase.

# 5. Inicia en modo desarrollo
npm run dev
```

La app estará disponible en http://localhost:3000

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run start      # Servidor de producción (requiere build previo)
npm run lint       # Linter
npm run test       # Ejecutar tests
npm run test:watch # Tests en modo watch
```

## Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta el SQL de `supabase/migrations/001_initial_schema.sql` en el **SQL Editor**.
3. Copia la **Project URL** y la **anon key** de tu proyecto y añádelas a `.env.local`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Endpoints

### `GET /api/search`

Parámetros de query:

| Param       | Tipo   | Requerido | Descripción                                      |
|-------------|--------|-----------|--------------------------------------------------|
| ciudad      | string | ✅        | Ciudad (mexicali, tijuana, etc.)                 |
| expediente  | string | ❌        | Filtro por número de expediente                  |
| partes      | string | ❌        | Filtro por nombre de las partes                  |
| fecha       | string | ❌        | Fecha ISO 8601 (default: hoy, máx 90 días atrás) |
| page        | number | ❌        | Página (default: 1)                              |
| pageSize    | number | ❌        | Resultados por página (default: 25, máx: 100)    |

**Ejemplo:**
```
GET /api/search?ciudad=mexicali&expediente=123&page=2&pageSize=25
```

**Respuesta:**
```json
{
  "results": [...],
  "total": 150,
  "filteredTotal": 23,
  "page": 2,
  "pageSize": 25,
  "totalPages": 1,
  "cached": false,
  "fecha": "2026-04-25"
}
```

**Códigos de respuesta:**
- `200` - OK
- `400` - Parámetros inválidos
- `429` - Rate limit excedido (30 req/min por IP)
- `500` - Error interno

### `POST /api/admin/scrape` 🔒

Dispara un scrape manual para una ciudad y fecha.

**Headers:** `Authorization: Bearer <API_SECRET_KEY>`

**Body JSON:**
```json
{ "ciudad": "mexicali", "fecha": "2026-04-25" }
```

### `GET /api/admin/logs` 🔒

Consulta los registros de scraping recientes.

**Headers:** `Authorization: Bearer <API_SECRET_KEY>`

**Query params:** `limit` (default: 100, máx: 500)

### `GET /api/cron/scrape`

Endpoint para el cron job de Vercel. Ejecuta scraping de todas las ciudades.
Protegido automáticamente por Vercel usando la variable `CRON_SECRET`.

## Scraper Python

```bash
cd scraper
python scraper.py --ciudad mexicali
python scraper.py --ciudad tijuana --fecha 2024-01-15 --output boletin.json
```

## Variables de entorno

| Variable          | Default                              | Descripción                              |
|-------------------|--------------------------------------|------------------------------------------|
| SUPABASE_URL      | (requerido)                          | URL del proyecto Supabase                |
| SUPABASE_ANON_KEY | (requerido)                          | Clave anónima de Supabase                |
| RATE_LIMIT_RPM    | 30                                   | Requests por minuto / IP                 |
| PJBC_BOLETIN_URL  | https://www.pjbc.gob.mx/boletin/    | URL del boletín PJBC                     |
| API_SECRET_KEY    | (vacío)                              | Clave para endpoints admin               |
| CRON_SECRET       | (auto en Vercel)                     | Secreto para autenticar cron jobs        |

## Despliegue

### Vercel

```bash
# Desde el directorio frontend
vercel --prod
```

Configura las variables de entorno en el panel de Vercel (Settings → Environment Variables).

El cron job se ejecuta diariamente a las 15:00 UTC (08:00 hora Baja California).

### Railway / VPS

```bash
npm run build
npm run start
```

## Seguridad

- Validación de inputs con Zod
- Rate limiting por IP (30 req/min, en memoria por proceso)
- Headers de seguridad (XSS, CSP, CORS, X-Frame-Options)
- Sanitización de datos del scraper
- Datos sensibles en variables de entorno
- Endpoints admin protegidos con `API_SECRET_KEY`

> **Nota sobre rate limiting**: El limitador actual es en memoria por proceso. En Vercel
> (serverless), cada instancia tiene su propio contador. Para un límite global compartido,
> usa [Upstash Ratelimit](https://github.com/upstash/ratelimit) o Vercel KV.

## Estructura del proyecto

```
.
├── frontend/                 # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Página principal
│   │   │   ├── layout.tsx        # Layout raíz
│   │   │   ├── globals.css       # Estilos globales
│   │   │   └── api/
│   │   │       ├── search/route.ts      # Búsqueda paginada
│   │   │       ├── admin/
│   │   │       │   ├── scrape/route.ts  # Scrape manual (admin)
│   │   │       │   └── logs/route.ts   # Logs de scraping (admin)
│   │   │       └── cron/
│   │   │           └── scrape/route.ts # Cron job diario
│   │   ├── lib/
│   │   │   ├── supabase.ts   # Cliente Supabase
│   │   │   ├── db.ts         # Operaciones de base de datos
│   │   │   ├── scraper.ts    # Scraper Node.js
│   │   │   └── rateLimit.ts  # Rate limiting
│   │   └── __tests__/        # Tests con Vitest
│   ├── package.json
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── .env.example
├── scraper/
│   ├── scraper.py            # Scraper Python (standalone)
│   └── requirements.txt
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── vercel.json
└── README.md
```
