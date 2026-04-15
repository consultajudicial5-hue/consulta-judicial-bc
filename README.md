# Consulta Judicial BC

Sistema de consulta del Boletín Judicial del Poder Judicial de Baja California (PJBC).

## Tecnologías

- **Frontend + Backend**: Next.js 14 (App Router) + TypeScript
- **Estilos**: Tailwind CSS 3
- **Scraper**: Node.js (Cheerio) + Python (stdlib)
- **Base de datos**: SQLite (Node.js built-in `node:sqlite`, disponible desde Node.js 22)
- **Seguridad**: Zod (validación), rate limiting, headers de seguridad

## Instalación

```bash
# 1. Entra al directorio frontend
cd frontend

# 2. Instala dependencias
npm install

# 3. Configura variables de entorno
cp .env.example .env.local
# Edita .env.local si es necesario

# 4. Inicia en modo desarrollo
npm run dev
```

La app estará disponible en http://localhost:3000

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Servidor de producción (requiere build previo)
npm run lint     # Linter
```

## Endpoints

### `GET /api/search`

Parámetros de query:

| Param       | Tipo   | Requerido | Descripción                        |
|-------------|--------|-----------|------------------------------------|
| ciudad      | string | ✅        | Ciudad (mexicali, tijuana, etc.)   |
| expediente  | string | ❌        | Filtro por número de expediente    |
| partes      | string | ❌        | Filtro por nombre de las partes    |

**Ejemplo:**
```
GET /api/search?ciudad=mexicali&expediente=123
```

**Respuesta:**
```json
{
  "results": [
    {
      "id": 1,
      "expediente": "123/2024",
      "partes": "García López Juan vs. Martínez Sánchez Ana",
      "juzgado": "Juzgado Primero Civil",
      "ciudad": "mexicali",
      "fecha": "2024-01-15",
      "acuerdo": "Se admite la demanda."
    }
  ],
  "total": 1,
  "cached": false,
  "fecha": "2024-01-15"
}
```

**Códigos de respuesta:**
- `200` - OK
- `400` - Parámetros inválidos
- `429` - Rate limit excedido (30 req/min por IP)
- `500` - Error interno

## Scraper Python

```bash
cd scraper
python scraper.py --ciudad mexicali
python scraper.py --ciudad tijuana --fecha 2024-01-15 --output boletin.json
```

## Variables de entorno

| Variable          | Default                              | Descripción               |
|-------------------|--------------------------------------|---------------------------|
| RATE_LIMIT_RPM    | 30                                   | Requests por minuto / IP  |
| PJBC_BOLETIN_URL  | https://www.pjbc.gob.mx/boletin_Judicial.aspx | URL del boletín PJBC      |
| API_SECRET_KEY    | (vacío)                              | Clave para endpoints admin|
| DATA_DIR          | ./data                               | Directorio de datos SQLite|

## Despliegue

### Vercel

```bash
# Desde el directorio frontend
vercel --prod
```

### Railway / VPS

```bash
npm run build
npm run start
```

## Seguridad

- Validación de inputs con Zod
- Rate limiting por IP (30 req/min)
- Headers de seguridad (XSS, CSP, CORS, X-Frame-Options)
- Sanitización de datos del scraper
- Datos sensibles en variables de entorno

## Estructura del proyecto

```
.
├── frontend/                 # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx     # Página principal
│   │   │   ├── layout.tsx   # Layout raíz
│   │   │   ├── globals.css  # Estilos globales
│   │   │   └── api/
│   │   │       └── search/
│   │   │           └── route.ts  # API endpoint
│   │   └── lib/
│   │       ├── db.ts        # SQLite
│   │       ├── scraper.ts   # Scraper Node.js
│   │       └── rateLimit.ts # Rate limiting
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── .env.example
├── scraper/
│   ├── scraper.py           # Scraper Python (standalone)
│   └── requirements.txt
└── README.md
```
