import { describe, it, expect } from 'vitest'
import { dots, hslToHex, waveColor } from './shimmer.js'

describe('hslToHex', () => {
  it('maps the primary hues to their hex colours', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#ff0000')
    expect(hslToHex(120, 1, 0.5)).toBe('#00ff00')
    expect(hslToHex(240, 1, 0.5)).toBe('#0000ff')
  })

  it('wraps hues outside 0..360, including negative ones', () => {
    expect(hslToHex(360, 1, 0.5)).toBe(hslToHex(0, 1, 0.5))
    expect(hslToHex(-120, 1, 0.5)).toBe(hslToHex(240, 1, 0.5))
  })
})

describe('waveColor', () => {
  it('always returns a #rrggbb colour', () => {
    for (let frame = 0; frame < 60; frame++) {
      for (let i = 0; i < 30; i++) expect(waveColor(i, frame)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('moves along the text and over time', () => {
    expect(waveColor(0, 0)).not.toBe(waveColor(1, 0))
    expect(waveColor(0, 0)).not.toBe(waveColor(0, 1))
  })

  it('shifts one character along as one frame passes at the matching offset', () => {
    // 18° per frame and 12° per character: frame f at index i equals frame f+2 at index i-3.
    expect(waveColor(3, 0)).toBe(waveColor(0, 2))
  })
})

describe('dots', () => {
  it('grows one dot at a time and resets', () => {
    expect([0, 1, 2, 3, 4].map((f) => dots(f).trim())).toEqual(['', '.', '..', '...', ''])
  })

  it('is always three columns wide, so the line never shifts', () => {
    for (let f = 0; f < 12; f++) expect(dots(f)).toHaveLength(3)
  })
})
