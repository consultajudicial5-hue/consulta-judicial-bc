// Uses Node.js built-in sqlite (available since Node.js 22+).
// require() is used instead of import because 'node:sqlite' is not yet
// in Node's type definitions and must be loaded as a CommonJS module.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { DatabaseSync } = require('node:sqlite') as any
import path from 'path'
import fs from 'fs'

const DATA_DIR = process.env.DATA_DIR ?? './data'
const DB_PATH = path.resolve(DATA_DIR, 'boletin.db')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NodeSqliteDb = any

let db: NodeSqliteDb | null = null

function getDb(): NodeSqliteDb {
  if (db) return db
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  initSchema(db)
  return db
}

function initSchema(db: NodeSqliteDb) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS expedientes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      expediente TEXT NOT NULL,
      partes     TEXT NOT NULL DEFAULT '',
      juzgado    TEXT NOT NULL DEFAULT '',
      ciudad     TEXT NOT NULL,
      fecha      TEXT NOT NULL,
      acuerdo    TEXT NOT NULL DEFAULT '',
      scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(expediente, ciudad, fecha)
    );

    CREATE INDEX IF NOT EXISTS idx_ciudad_fecha ON expedientes(ciudad, fecha);
    CREATE INDEX IF NOT EXISTS idx_expediente ON expedientes(expediente);

    CREATE TABLE IF NOT EXISTS scrape_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ciudad     TEXT NOT NULL,
      fecha      TEXT NOT NULL,
      status     TEXT NOT NULL,
      count      INTEGER NOT NULL DEFAULT 0,
      error      TEXT,
      scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(ciudad, fecha)
    );
  `)
}

export interface ExpedienteRow {
  id: number
  expediente: string
  partes: string
  juzgado: string
  ciudad: string
  fecha: string
  acuerdo: string
}

export function getExpedientes(ciudad: string, fecha: string): ExpedienteRow[] {
  const db = getDb()
  return db.prepare(`
    SELECT id, expediente, partes, juzgado, ciudad, fecha, acuerdo
    FROM expedientes
    WHERE ciudad = ? AND fecha = ?
    ORDER BY expediente ASC
  `).all(ciudad, fecha) as ExpedienteRow[]
}

export function upsertExpedientes(rows: Omit<ExpedienteRow, 'id'>[]): number {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO expedientes (expediente, partes, juzgado, ciudad, fecha, acuerdo)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(expediente, ciudad, fecha) DO UPDATE SET
      partes = excluded.partes,
      juzgado = excluded.juzgado,
      acuerdo = excluded.acuerdo,
      scraped_at = datetime('now')
  `)
  const begin = db.prepare('BEGIN')
  const commit = db.prepare('COMMIT')
  const rollback = db.prepare('ROLLBACK')
  begin.run()
  try {
    for (const row of rows) {
      stmt.run(row.expediente, row.partes, row.juzgado, row.ciudad, row.fecha, row.acuerdo)
    }
    commit.run()
  } catch (e) {
    rollback.run()
    throw e
  }
  return rows.length
}

export function hasScrapeLog(ciudad: string, fecha: string): boolean {
  const db = getDb()
  const row = db.prepare(
    `SELECT 1 FROM scrape_log WHERE ciudad = ? AND fecha = ? AND status = 'ok'`
  ).get(ciudad, fecha)
  return !!row
}

export function recordScrapeLog(ciudad: string, fecha: string, status: 'ok' | 'error', count: number, error?: string) {
  const db = getDb()
  db.prepare(`
    INSERT INTO scrape_log (ciudad, fecha, status, count, error)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(ciudad, fecha) DO UPDATE SET
      status = excluded.status,
      count = excluded.count,
      error = excluded.error,
      scraped_at = datetime('now')
  `).run(ciudad, fecha, status, count, error ?? null)
}
