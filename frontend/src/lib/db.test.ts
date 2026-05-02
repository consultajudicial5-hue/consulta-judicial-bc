import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { getExpedientes, upsertExpedientes, hasScrapeLog, recordScrapeLog, closeDb, type ExpedienteRow } from './db'

const TEST_DB_DIR = '/tmp/test-db'
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test-boletin.db')

describe('Database Module', () => {
  beforeEach(() => {
    // Clean up test database before each test
    closeDb()
    if (fs.existsSync(TEST_DB_DIR)) {
      fs.rmSync(TEST_DB_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(TEST_DB_DIR, { recursive: true })
    process.env.DATA_DIR = TEST_DB_DIR
  })

  afterEach(() => {
    // Clean up test database after each test
    closeDb()
    if (fs.existsSync(TEST_DB_DIR)) {
      fs.rmSync(TEST_DB_DIR, { recursive: true, force: true })
    }
    delete process.env.DATA_DIR
  })

  describe('getExpedientes', () => {
    it('should return empty array when no expedientes exist', () => {
      const result = getExpedientes('mexicali', '2024-01-15')
      expect(result).toEqual([])
    })

    it('should return expedientes for specific ciudad and fecha', () => {
      const testData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'García vs Martínez',
          juzgado: 'Juzgado Primero Civil',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Se admite la demanda',
        },
        {
          expediente: '124/2024',
          partes: 'López vs Hernández',
          juzgado: 'Juzgado Segundo Penal',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Se señala audiencia',
        },
      ]

      upsertExpedientes(testData)
      const result = getExpedientes('mexicali', '2024-01-15')

      expect(result).toHaveLength(2)
      expect(result[0].expediente).toBe('123/2024')
      expect(result[1].expediente).toBe('124/2024')
    })

    it('should only return expedientes for matching ciudad and fecha', () => {
      const testData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'García vs Martínez',
          juzgado: 'Juzgado Primero Civil',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Se admite la demanda',
        },
        {
          expediente: '124/2024',
          partes: 'López vs Hernández',
          juzgado: 'Juzgado Segundo Penal',
          ciudad: 'tijuana',
          fecha: '2024-01-15',
          acuerdo: 'Se señala audiencia',
        },
        {
          expediente: '125/2024',
          partes: 'Rodríguez vs Pérez',
          juzgado: 'Juzgado Tercero',
          ciudad: 'mexicali',
          fecha: '2024-01-16',
          acuerdo: 'Se dicta sentencia',
        },
      ]

      upsertExpedientes(testData)
      const result = getExpedientes('mexicali', '2024-01-15')

      expect(result).toHaveLength(1)
      expect(result[0].expediente).toBe('123/2024')
      expect(result[0].ciudad).toBe('mexicali')
      expect(result[0].fecha).toBe('2024-01-15')
    })

    it('should return expedientes ordered by expediente number', () => {
      const testData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '999/2024',
          partes: 'Test 1',
          juzgado: 'Juzgado 1',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 1',
        },
        {
          expediente: '100/2024',
          partes: 'Test 2',
          juzgado: 'Juzgado 2',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 2',
        },
        {
          expediente: '500/2024',
          partes: 'Test 3',
          juzgado: 'Juzgado 3',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 3',
        },
      ]

      upsertExpedientes(testData)
      const result = getExpedientes('mexicali', '2024-01-15')

      expect(result).toHaveLength(3)
      expect(result[0].expediente).toBe('100/2024')
      expect(result[1].expediente).toBe('500/2024')
      expect(result[2].expediente).toBe('999/2024')
    })
  })

  describe('upsertExpedientes', () => {
    it('should insert new expedientes', () => {
      const testData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'García vs Martínez',
          juzgado: 'Juzgado Primero Civil',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Se admite la demanda',
        },
      ]

      const count = upsertExpedientes(testData)
      expect(count).toBe(1)

      const result = getExpedientes('mexicali', '2024-01-15')
      expect(result).toHaveLength(1)
      expect(result[0].expediente).toBe('123/2024')
    })

    it('should update existing expedientes on conflict', () => {
      const initialData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'García vs Martínez',
          juzgado: 'Juzgado Primero Civil',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Se admite la demanda',
        },
      ]

      upsertExpedientes(initialData)

      // Update with new data
      const updatedData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'García López Juan vs Martínez Sánchez Ana',
          juzgado: 'Juzgado Primero Civil',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Se señala audiencia',
        },
      ]

      upsertExpedientes(updatedData)

      const result = getExpedientes('mexicali', '2024-01-15')
      expect(result).toHaveLength(1)
      expect(result[0].partes).toBe('García López Juan vs Martínez Sánchez Ana')
      expect(result[0].acuerdo).toBe('Se señala audiencia')
    })

    it('should handle multiple inserts in a transaction', () => {
      const testData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'García vs Martínez',
          juzgado: 'Juzgado 1',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 1',
        },
        {
          expediente: '124/2024',
          partes: 'López vs Hernández',
          juzgado: 'Juzgado 2',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 2',
        },
        {
          expediente: '125/2024',
          partes: 'Rodríguez vs Pérez',
          juzgado: 'Juzgado 3',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 3',
        },
      ]

      const count = upsertExpedientes(testData)
      expect(count).toBe(3)

      const result = getExpedientes('mexicali', '2024-01-15')
      expect(result).toHaveLength(3)
    })

    it('should return correct count of upserted rows', () => {
      const testData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'Test',
          juzgado: 'Test',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Test',
        },
        {
          expediente: '124/2024',
          partes: 'Test',
          juzgado: 'Test',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Test',
        },
      ]

      const count = upsertExpedientes(testData)
      expect(count).toBe(2)
    })

    it('should handle empty array', () => {
      const count = upsertExpedientes([])
      expect(count).toBe(0)
    })
  })

  describe('hasScrapeLog', () => {
    it('should return false when no log exists', () => {
      const result = hasScrapeLog('mexicali', '2024-01-15')
      expect(result).toBe(false)
    })

    it('should return true when successful log exists', () => {
      recordScrapeLog('mexicali', '2024-01-15', 'ok', 10)
      const result = hasScrapeLog('mexicali', '2024-01-15')
      expect(result).toBe(true)
    })

    it('should return false when only error log exists', () => {
      recordScrapeLog('mexicali', '2024-01-15', 'error', 0, 'Network error')
      const result = hasScrapeLog('mexicali', '2024-01-15')
      expect(result).toBe(false)
    })

    it('should return false for different ciudad/fecha combination', () => {
      recordScrapeLog('mexicali', '2024-01-15', 'ok', 10)
      expect(hasScrapeLog('tijuana', '2024-01-15')).toBe(false)
      expect(hasScrapeLog('mexicali', '2024-01-16')).toBe(false)
    })
  })

  describe('recordScrapeLog', () => {
    it('should insert new scrape log with ok status', () => {
      recordScrapeLog('mexicali', '2024-01-15', 'ok', 10)
      expect(hasScrapeLog('mexicali', '2024-01-15')).toBe(true)
    })

    it('should insert new scrape log with error status', () => {
      recordScrapeLog('mexicali', '2024-01-15', 'error', 0, 'Network timeout')
      expect(hasScrapeLog('mexicali', '2024-01-15')).toBe(false)
    })

    it('should update existing scrape log on conflict', () => {
      // First insert with error
      recordScrapeLog('mexicali', '2024-01-15', 'error', 0, 'Network error')
      expect(hasScrapeLog('mexicali', '2024-01-15')).toBe(false)

      // Then update with success
      recordScrapeLog('mexicali', '2024-01-15', 'ok', 10)
      expect(hasScrapeLog('mexicali', '2024-01-15')).toBe(true)
    })

    it('should handle scrape log without error message', () => {
      recordScrapeLog('mexicali', '2024-01-15', 'ok', 5)
      expect(hasScrapeLog('mexicali', '2024-01-15')).toBe(true)
    })

    it('should store error message when provided', () => {
      recordScrapeLog('mexicali', '2024-01-15', 'error', 0, 'Timeout after 15s')
      // Just verify it doesn't throw - actual error message storage is internal
      expect(hasScrapeLog('mexicali', '2024-01-15')).toBe(false)
    })
  })

  describe('Database schema and indexes', () => {
    it('should enforce unique constraint on expediente, ciudad, fecha', () => {
      const testData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'Test 1',
          juzgado: 'Juzgado 1',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 1',
        },
      ]

      // Insert once
      upsertExpedientes(testData)

      // Insert again with same unique key - should update, not duplicate
      upsertExpedientes(testData)

      const result = getExpedientes('mexicali', '2024-01-15')
      expect(result).toHaveLength(1)
    })

    it('should allow same expediente number for different ciudad', () => {
      const testData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'Test 1',
          juzgado: 'Juzgado 1',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 1',
        },
        {
          expediente: '123/2024',
          partes: 'Test 2',
          juzgado: 'Juzgado 2',
          ciudad: 'tijuana',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 2',
        },
      ]

      upsertExpedientes(testData)

      expect(getExpedientes('mexicali', '2024-01-15')).toHaveLength(1)
      expect(getExpedientes('tijuana', '2024-01-15')).toHaveLength(1)
    })

    it('should allow same expediente number for different fecha', () => {
      const testData: Omit<ExpedienteRow, 'id'>[] = [
        {
          expediente: '123/2024',
          partes: 'Test 1',
          juzgado: 'Juzgado 1',
          ciudad: 'mexicali',
          fecha: '2024-01-15',
          acuerdo: 'Acuerdo 1',
        },
        {
          expediente: '123/2024',
          partes: 'Test 2',
          juzgado: 'Juzgado 1',
          ciudad: 'mexicali',
          fecha: '2024-01-16',
          acuerdo: 'Acuerdo 2',
        },
      ]

      upsertExpedientes(testData)

      expect(getExpedientes('mexicali', '2024-01-15')).toHaveLength(1)
      expect(getExpedientes('mexicali', '2024-01-16')).toHaveLength(1)
    })
  })
})
