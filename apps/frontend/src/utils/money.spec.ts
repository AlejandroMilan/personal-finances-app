import { describe, expect, it } from 'vitest'
import { formatCurrency } from './money'

describe('formatCurrency', () => {
  it('formats an amount in the default currency', () => {
    expect(formatCurrency(12.5)).toBe('$12.50')
  })

  it('formats an amount in a custom currency', () => {
    expect(formatCurrency(100, 'EUR')).toBe('€100.00')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
})
