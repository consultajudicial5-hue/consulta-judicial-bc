-- Migration: 001_initial_schema
-- Run this in your Supabase SQL editor or via the Supabase CLI before deploying.

CREATE TABLE IF NOT EXISTS expedientes (
  id          BIGSERIAL PRIMARY KEY,
  expediente  TEXT      NOT NULL,
  partes      TEXT      NOT NULL DEFAULT '',
  juzgado     TEXT      NOT NULL DEFAULT '',
  ciudad      TEXT      NOT NULL,
  fecha       DATE      NOT NULL,
  acuerdo     TEXT      NOT NULL DEFAULT '',
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expediente, ciudad, fecha)
);

CREATE INDEX IF NOT EXISTS idx_expedientes_ciudad_fecha ON expedientes (ciudad, fecha);
CREATE INDEX IF NOT EXISTS idx_expedientes_expediente  ON expedientes (expediente);

CREATE TABLE IF NOT EXISTS scrape_log (
  id          BIGSERIAL PRIMARY KEY,
  ciudad      TEXT      NOT NULL,
  fecha       DATE      NOT NULL,
  status      TEXT      NOT NULL CHECK (status IN ('ok', 'error')),
  count       INTEGER   NOT NULL DEFAULT 0,
  error       TEXT,
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ciudad, fecha)
);

CREATE INDEX IF NOT EXISTS idx_scrape_log_ciudad_fecha ON scrape_log (ciudad, fecha);
