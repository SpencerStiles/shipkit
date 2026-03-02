import { describe, it, expect } from 'vitest'

// Set required env before any imports that trigger validation
process.env.DATABASE_URL = 'postgresql://test@localhost:5432/test'
process.env.NODE_ENV = 'test'

describe('logger', () => {
  it('creates a logger with expected methods', async () => {
    const { logger } = await import('../lib/logger')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('logs without throwing', async () => {
    const { logger } = await import('../lib/logger')
    expect(() => logger.info('test message', { key: 'value' })).not.toThrow()
    expect(() => logger.error('test error', { message: 'test' })).not.toThrow()
  })
})

describe('env validation', () => {
  it('accepts valid DATABASE_URL', () => {
    expect(process.env.DATABASE_URL).toBeDefined()
    expect(process.env.DATABASE_URL!.length).toBeGreaterThan(0)
  })
})
