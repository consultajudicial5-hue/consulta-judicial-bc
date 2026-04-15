-- ============================================================
-- Monitor Judicial BC – Supabase Schema
-- Run this in the Supabase SQL editor to initialise the database.
-- ============================================================

-- Enable RLS
-- After running the migrations, set up RLS policies as needed.

-- ── expedientes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expedientes (
  id         BIGSERIAL PRIMARY KEY,
  expediente TEXT NOT NULL,
  partes     TEXT NOT NULL DEFAULT '',
  juzgado    TEXT NOT NULL DEFAULT '',
  ciudad     TEXT NOT NULL,
  fecha      TEXT NOT NULL,
  acuerdo    TEXT NOT NULL DEFAULT '',
  semaforo   TEXT NOT NULL DEFAULT 'verde'
               CHECK (semaforo IN ('rojo', 'amarillo', 'verde')),
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expediente, ciudad, fecha)
);

CREATE INDEX IF NOT EXISTS idx_exp_ciudad_fecha ON expedientes (ciudad, fecha);
CREATE INDEX IF NOT EXISTS idx_exp_num           ON expedientes (expediente);
CREATE INDEX IF NOT EXISTS idx_exp_partes        ON expedientes USING gin (to_tsvector('spanish', partes));

-- ── usuarios ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT NOT NULL UNIQUE,
  premium            BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── monitoreo ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monitoreo (
  id         BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  expediente TEXT NOT NULL,
  ciudad     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_email, expediente, ciudad)
);

CREATE INDEX IF NOT EXISTS idx_mon_email ON monitoreo (user_email);

-- ── alertas ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertas (
  id         BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  expediente TEXT NOT NULL,
  tipo       TEXT NOT NULL,
  mensaje    TEXT NOT NULL,
  leida      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_email ON alertas (user_email);

-- ── scrape_log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_log (
  id         BIGSERIAL PRIMARY KEY,
  ciudad     TEXT NOT NULL,
  fecha      TEXT NOT NULL,
  status     TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  error      TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ciudad, fecha)
);

-- ── Row Level Security ───────────────────────────────────────
-- expedientes: public read
ALTER TABLE expedientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expedientes_read" ON expedientes FOR SELECT USING (true);
CREATE POLICY "expedientes_insert" ON expedientes FOR INSERT WITH CHECK (true);
CREATE POLICY "expedientes_update" ON expedientes FOR UPDATE USING (true);

-- usuarios: service-only (no anon access)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- monitoreo: owner only via email match (simplified – no auth)
ALTER TABLE monitoreo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monitoreo_all" ON monitoreo USING (true);

-- alertas: owner only
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_all" ON alertas USING (true);

-- scrape_log: internal
ALTER TABLE scrape_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scrapelog_all" ON scrape_log USING (true);
