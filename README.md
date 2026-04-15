# Monitor Judicial BC

Sistema SaaS de consulta y monitoreo del Boletín Judicial del Poder Judicial de Baja California (PJBC).

## Tecnologías

- **Frontend + API**: Next.js 15 (App Router) + TypeScript
- **Estilos**: Tailwind CSS 3
- **Base de datos**: Supabase (PostgreSQL)
- **Pagos**: Stripe (suscripción mensual)
- **Scraper**: Node.js (Cheerio) + Python (stdlib)
- **Deploy**: Vercel (CI/CD automático)
- **Automatización**: GitHub Actions (scraper diario)

## Configuración inicial

### 1. Supabase

1. Crea un proyecto en [app.supabase.com](https://app.supabase.com)
2. Ve a **SQL Editor** y ejecuta `supabase/schema.sql`
3. Copia la URL y la anon key del proyecto

### 2. Stripe

1. Crea una cuenta en [stripe.com](https://stripe.com)
2. Crea un producto "Premium" con precio recurrente (~$299 MXN/mes)
3. Copia el `price_id` del precio creado
4. Configura un webhook apuntando a `https://tu-dominio.vercel.app/api/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.deleted`

### 3. Variables de entorno

```bash
cd frontend
cp .env.example .env.local
# Edita .env.local con tus credenciales
```

Variables requeridas:

| Variable               | Descripción                                     |
|------------------------|-------------------------------------------------|
| `SUPABASE_URL`         | URL de tu proyecto Supabase                     |
| `SUPABASE_ANON_KEY`    | Anon key de Supabase                            |
| `STRIPE_SECRET_KEY`    | Clave secreta de Stripe                         |
| `STRIPE_WEBHOOK_SECRET`| Webhook secret de Stripe                        |
| `STRIPE_PRICE_ID`      | ID del precio Premium en Stripe                 |
| `NEXT_PUBLIC_APP_URL`  | URL pública de la app (para Stripe redirects)   |

Variables opcionales:

| Variable               | Default                                         | Descripción                |
|------------------------|-------------------------------------------------|----------------------------|
| `RATE_LIMIT_RPM`       | 30                                              | Requests por minuto / IP   |
| `PJBC_BOLETIN_BASE`    | https://www.pjbc.gob.mx/boletinj                | Base URL del boletín PJBC  |
| `RESEND_API_KEY`       | -                                               | API key de Resend (emails) |
| `RESEND_FROM`          | -                                               | Email remitente de alertas |

### 4. Instalación y desarrollo local

```bash
cd frontend
npm install
npm run dev
```

La app estará en http://localhost:3000

## Deploy en Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Vercel detecta automáticamente `vercel.json` → usa `frontend/` como raíz
3. Configura las variables de entorno en el dashboard de Vercel
4. Deploy automático en cada push a `main`

## GitHub Actions – Scraper automático

El scraper corre automáticamente cada día hábil a las 8 AM (hora Ciudad de México).

Configurar secretos en **Settings → Secrets → Actions**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Ejecutar manualmente: **Actions → Daily Boletín Scraper → Run workflow**

## Endpoints API

| Endpoint             | Método | Descripción                                 | Plan    |
|----------------------|--------|---------------------------------------------|---------|
| `/api/search`        | GET    | Búsqueda por expediente y ciudad            | Gratis  |
| `/api/name-search`   | GET    | Búsqueda por nombre de las partes           | Premium |
| `/api/monitor`       | POST   | Agregar expediente a monitoreo              | Gratis* |
| `/api/alerts`        | GET    | Obtener alertas del usuario                 | Gratis  |
| `/api/subscribe`     | POST   | Iniciar checkout de suscripción Premium     | -       |
| `/api/webhook`       | POST   | Webhook de Stripe (marcar usuario premium)  | -       |

*Plan gratis: 1 expediente monitoreable. Premium: ilimitado.

## Scraper Python (standalone)

```bash
cd scraper

# Una ciudad
python scraper.py --ciudad mexicali

# Todas las ciudades
python scraper.py --all-cities

# Con fecha específica
python scraper.py --ciudad tijuana --fecha 2024-01-15 --output boletin.json

# Guardar en Supabase directamente
SUPABASE_URL=... SUPABASE_ANON_KEY=... python scraper.py --all-cities --supabase
```

## Modelo de negocio

**Plan Gratis:**
- Búsqueda por número de expediente
- 1 expediente en monitoreo

**Plan Premium ($299 MXN/mes):**
- Búsqueda por nombre de las partes
- Monitoreo ilimitado de expedientes
- Alertas en tiempo real

## Semáforo de urgencia

| Color     | Significado                                          |
|-----------|------------------------------------------------------|
| 🔴 Rojo   | Emplazamiento, requerimiento, embargo, apercibimiento |
| 🟡 Amarillo| Admisión, señalamiento, acuerdo, vinculación          |
| 🟢 Verde  | Informativo, trámite rutinario                        |

## Estructura del proyecto

```
.
├── vercel.json              # Configuración Vercel (rootDirectory: frontend)
├── supabase/
│   └── schema.sql           # Schema SQL para Supabase
├── frontend/                # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx     # Página principal
│   │   │   ├── layout.tsx   # Layout raíz
│   │   │   └── api/
│   │   │       ├── search/      # Búsqueda por expediente
│   │   │       ├── name-search/ # Búsqueda por nombre (Premium)
│   │   │       ├── monitor/     # Monitoreo de expedientes
│   │   │       ├── alerts/      # Alertas del usuario
│   │   │       ├── subscribe/   # Checkout Stripe
│   │   │       └── webhook/     # Webhook Stripe
│   │   └── lib/
│   │       ├── supabase.ts  # Cliente Supabase
│   │       ├── db.ts        # Operaciones de base de datos
│   │       ├── scraper.ts   # Scraper TypeScript
│   │       └── rateLimit.ts # Rate limiting
│   ├── package.json
│   └── .env.example
├── scraper/
│   ├── scraper.py           # Scraper Python (standalone + cron)
│   └── requirements.txt
└── .github/
    └── workflows/
        └── scraper.yml      # GitHub Action: scraper diario
```

