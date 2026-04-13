# Consulta Judicial BC

Plataforma fullstack para consultar expedientes del **Poder Judicial de Baja California**.

- **Frontend:** Next.js 14 (App Router) — landing page responsive con buscador y planes de precios.
- **Backend:** FastAPI — scraper real del Boletín Judicial Oficial (pjbc.gob.mx) con fallback a datos de ejemplo.

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|---------------|
| Docker      | 20+            |
| Docker Compose | 2+          |
| Node.js     | 18+ (local)    |
| Python      | 3.11+ (local)  |

---

## Inicio rápido con Docker Compose

```bash
# 1. Clona el repositorio
git clone https://github.com/consultajudicial5-hue/consulta-judicial-bc.git
cd consulta-judicial-bc

# 2. Levanta todos los servicios
docker-compose up --build
```

| Servicio   | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000       |
| Backend    | http://localhost:8000       |
| API Docs   | http://localhost:8000/docs  |
| PostgreSQL | localhost:5432              |

Para detener los servicios:

```bash
docker-compose down
```

---

## Ejecución local (sin Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Abre http://localhost:3000 en el navegador.

---

## Variables de entorno

| Variable              | Descripción                            | Valor por defecto        |
|-----------------------|----------------------------------------|--------------------------|
| `NEXT_PUBLIC_API_URL` | URL base del backend (desde el frontend) | `http://localhost:8000` |
| `POSTGRES_USER`       | Usuario de la base de datos            | `pjbc`                   |
| `POSTGRES_PASSWORD`   | Contraseña de la base de datos         | `pjbcpassword`           |
| `POSTGRES_DB`         | Nombre de la base de datos             | `consulta_judicial`      |

---

## Endpoints del backend

| Método | Ruta                          | Descripción                                              |
|--------|-------------------------------|----------------------------------------------------------|
| GET    | `/health`                     | Verificación de estado: `{"status": "healthy"}`         |
| GET    | `/api/expedientes?query=...`  | Busca expedientes (scraper real + fallback)             |
| GET    | `/api/expedientes/{numero}`   | Detalle de un expediente con acuerdos                   |
| GET    | `/docs`                       | Documentación interactiva Swagger UI                    |

---

## Scraper real

El backend incluye `scraper_real.py` que consulta directamente el Boletín Judicial Oficial:

- URL: https://www.pjbc.gob.mx/boletin_Judicial.aspx
- Maneja el flujo ASP.NET WebForms (`__VIEWSTATE`, `__EVENTVALIDATION`, postbacks).
- Si el sitio no está disponible o no devuelve resultados, el API responde con datos de ejemplo para no interrumpir el servicio.

---

## Estructura del proyecto

```
consulta-judicial-bc/
├── backend/
│   ├── main.py              # API FastAPI principal
│   ├── scraper_real.py      # Scraper del Boletín Judicial PJBC
│   └── requirements.txt     # Dependencias Python
├── frontend/
│   ├── app/
│   │   ├── globals.css      # Estilos base y variables CSS
│   │   ├── layout.js        # Root layout Next.js App Router
│   │   └── page.js          # Landing page con buscador y precios
│   ├── next.config.js       # Configuración Next.js
│   ├── tailwind.config.js   # Configuración Tailwind CSS
│   └── package.json         # Dependencias Node.js
├── docker-compose.yml       # Orquestación de servicios
└── README.md                # Este archivo
```

---

✅ PROYECTO COMPLETO GENERADO - LISTO PARA ZIP
