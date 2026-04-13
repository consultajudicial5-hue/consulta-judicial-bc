# Consulta Judicial BC

Proyecto fullstack para buscar expedientes judiciales del Poder Judicial de Baja California.
Frontend en **Next.js 14** (App Router) y backend en **FastAPI** (Python).

✅ PROYECTO COMPLETO GENERADO - LISTO PARA ZIP

---

## Estructura del proyecto

```
consulta-judicial-bc/
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
├── backend/
│   ├── main.py
│   ├── scraper_real.py
│   ├── requirements.txt
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## Requisitos previos

- **Docker** y **Docker Compose** (recomendado para ejecución completa)
- **Node.js 18+** y **npm** (para frontend local)
- **Python 3.11+** (para backend local)

---

## Instalación y ejecución con Docker Compose (recomendado)

```bash
# 1. Clona el repositorio
git clone https://github.com/consultajudicial5-hue/consulta-judicial-bc.git
cd consulta-judicial-bc

# 2. Levanta todos los servicios
docker-compose up --build
```

Los servicios quedarán disponibles en:

| Servicio   | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000       |
| Backend    | http://localhost:8000       |
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

# Crear entorno virtual
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar variables de entorno
cp .env.example .env

# Iniciar servidor
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

El backend estará disponible en: http://localhost:8000

### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

El frontend estará disponible en: http://localhost:3000

---

## Variables de entorno

### Backend (`backend/.env.example`)

| Variable           | Descripción                                    | Default |
|--------------------|------------------------------------------------|---------|
| `USE_REAL_SCRAPER` | `1` para usar scraper real del PJBC, `0` mock | `0`     |
| `PJBC_BASE_URL`    | URL del Boletín Judicial del PJBC              | Ver archivo |

### Frontend

| Variable               | Descripción                    | Default                    |
|------------------------|--------------------------------|----------------------------|
| `NEXT_PUBLIC_API_URL`  | URL base del backend           | `http://localhost:8000`    |

---

## Endpoints del API

| Método | Ruta                        | Descripción                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/health`                   | Estado de salud del servicio             |
| GET    | `/api/expedientes?query=…`  | Buscar expedientes por número o palabra  |
| GET    | `/api/expedientes/{numero}` | Detalle de un expediente con acuerdos    |

### Ejemplo de respuesta de búsqueda

```json
[
  {
    "numero": "123/2024",
    "juzgado": "Juzgado Primero Civil de Tijuana",
    "materia": "Civil",
    "estatus": "En trámite"
  }
]
```

### Ejemplo de detalle

```json
{
  "numero": "123/2024",
  "juzgado": "Juzgado Primero Civil de Tijuana",
  "materia": "Civil",
  "estatus": "En trámite",
  "acuerdos": [
    "Acuerdo 01 - Fecha: 2024-02-15 - Notificación realizada a las partes",
    "Acuerdo 02 - Fecha: 2024-03-05 - Audiencia convocada para el 20 de abril de 2024"
  ]
}
```

---

## Activar el scraper real del PJBC

Para extraer datos reales del Boletín Judicial oficial:

```bash
# En backend/.env
USE_REAL_SCRAPER=1
```

El scraper (`backend/scraper_real.py`) maneja automáticamente:
- `__VIEWSTATE` y `__EVENTVALIDATION` de ASP.NET WebForms
- Reintentos con backoff exponencial
- Bypass de Cloudflare usando `cloudscraper` si está instalado

---

## Notas de producción

- Configura SSL/TLS en el servidor de producción.
- Reemplaza las contraseñas de PostgreSQL por valores seguros.
- Usa variables de entorno seguras (no las incluyas en el repositorio).
- Configura un dominio real y actualiza `NEXT_PUBLIC_API_URL` en consecuencia.
- Considera autenticación de usuarios si restringes el acceso.

---

✅ PROYECTO COMPLETO GENERADO - LISTO PARA ZIP
