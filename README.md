# ⚖️ Consulta Judicial BC

Plataforma web para consultar el Boletín Judicial del Poder Judicial de Baja California (PJBC), con análisis de acuerdos mediante IA basada en reglas, monitoreo automático de expedientes, búsqueda de remates y análisis de documentos legales.

## Características

- 🔍 **Búsqueda de expedientes** en los últimos 7 días del boletín judicial
- 🧠 **Análisis de IA** de acuerdos (basado en reglas NLP, sin API externa)
- 🔔 **Monitor automático** de expedientes con detección de cambios
- 🏛️ **Búsqueda de remates y subastas** judiciales
- 📄 **Analizador de documentos** legales (PDF y TXT)

## Prerrequisitos

- Python 3.11+
- Node.js 18+

## Configuración del Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

La API estará disponible en `http://localhost:8000`.

## Configuración del Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Variables de Entorno

Crea un archivo `.env` en el directorio `backend/` si necesitas configuración adicional:

```env
# Opcional: para futuras integraciones con IA externa
OPENAI_API_KEY=sk-...  # Opcional, la app funciona sin esto
```

El analizador de IA funciona completamente sin API externa usando reglas NLP.

## Documentación de la API

### Búsqueda

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/search` | Busca un expediente en el boletín |
| `GET` | `/api/cities` | Retorna ciudades y juzgados disponibles |

**POST /api/search**
```json
{
  "ciudad": "Tijuana",
  "juzgado": "Juzgado Primero Civil",
  "expediente": "123/2024"
}
```

### Análisis

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Analiza texto de un acuerdo judicial |

**POST /api/analyze**
```json
{ "texto": "Se decreta el embargo de bienes del demandado..." }
```

### Monitor

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/monitor` | Lista expedientes monitoreados |
| `POST` | `/api/monitor` | Agrega expediente al monitor |
| `DELETE` | `/api/monitor/{id}` | Elimina expediente del monitor |
| `POST` | `/api/monitor/check` | Ejecuta revisión manual |

### Documentos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/documents/analyze` | Analiza documento PDF o TXT |

### Remates

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/remates` | Busca remates y subastas judiciales |

Parámetros opcionales: `ciudad`, `fecha_inicio` (YYYY-MM-DD), `fecha_fin` (YYYY-MM-DD).

## Estructura del Proyecto

```
consulta-judicial-bc/
├── backend/
│   ├── main.py              # Punto de entrada FastAPI
│   ├── scraper.py           # Scraper del boletín PJBC
│   ├── analyzer.py          # Analizador de acuerdos (NLP)
│   ├── monitor.py           # Sistema de monitoreo (TinyDB)
│   ├── requirements.txt
│   ├── data/
│   │   └── monitor.json     # Base de datos de expedientes monitoreados
│   └── routers/
│       ├── search.py
│       ├── analyze.py
│       ├── monitoring.py
│       ├── documents.py
│       └── remates.py
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx         # Búsqueda principal
    │   │   ├── monitor/
    │   │   ├── remates/
    │   │   └── documentos/
    │   └── components/
    │       ├── Header.tsx
    │       └── AnalysisModal.tsx
    ├── next.config.js
    ├── tailwind.config.js
    └── package.json
```

## Notas

- El scraper hace peticiones reales al sitio `pjbc.gob.mx`. Si el boletín no está disponible, retorna lista vacía.
- El analizador de IA no requiere ninguna API externa; funciona con reglas NLP en español.
- El monitoreo automático se ejecuta diariamente a las 10:00am (hora Tijuana/México).
- Los datos de monitoreo se almacenan localmente en `backend/data/monitor.json`.
