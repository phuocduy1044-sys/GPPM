import { describe, it, expect } from 'vitest'
import { applyTypedInput } from './useKeyboard.js'

describe('applyTypedInput (Vietnamese Unicode IME support for Telex & VNI)', () => {
  it('appends normal characters and advances caret', () => {
    let state = { input: '', caret: 0 }
    state = applyTypedInput(state.input, state.caret, 'v')
    expect(state).toEqual({ input: 'v', caret: 1 })
    state = applyTypedInput(state.input, state.caret, 'i')
    expect(state).toEqual({ input: 'vi', caret: 2 })
  })

  it('handles Telex character replacement with embedded backspace', () => {
    // User types 't', 'i', 'e', then 'e' -> Unikey sends '\bê'
    let state = { input: 'tie', caret: 3 }
    state = applyTypedInput(state.input, state.caret, '\bê')
    expect(state).toEqual({ input: 'tiê', caret: 3 })

    // User types 's' -> Unikey sends '\bế'
    state = applyTypedInput(state.input, state.caret, '\bế')
    expect(state).toEqual({ input: 'tiế', caret: 3 })

    // User types 'n', 'g'
    state = applyTypedInput(state.input, state.caret, 'n')
    state = applyTypedInput(state.input, state.caret, 'g')
    expect(state).toEqual({ input: 'tiếng', caret: 5 })
  })

  it('handles VNI numerical diacritic replacement', () => {
    // User types 'v', 'i', 'e', then '6' (circumflex) -> Unikey sends '\bê'
    let state = { input: 'vie', caret: 3 }
    state = applyTypedInput(state.input, state.caret, '\bê')
    expect(state).toEqual({ input: 'viê', caret: 3 })

    // User types '5' (dot below) -> Unikey sends '\bệ'
    state = applyTypedInput(state.input, state.caret, '\bệ')
    expect(state).toEqual({ input: 'việ', caret: 3 })

    // User types 't' -> 'việt'
    state = applyTypedInput(state.input, state.caret, 't')
    expect(state).toEqual({ input: 'việt', caret: 4 })
  })

  it('handles multiple backspaces in a burst from IME (e.g. nguyeenx -> nguyễn)', () => {
    // Simulating burst replacement for 'nguyee' -> 'nguyễ' (deleting 2 'e's and inserting 'ễ')
    let state = { input: 'nguyee', caret: 6 }
    state = applyTypedInput(state.input, state.caret, '\b\bễ')
    expect(state).toEqual({ input: 'nguyễ', caret: 5 })
    state = applyTypedInput(state.input, state.caret, 'n')
    expect(state).toEqual({ input: 'nguyễn', caret: 6 })
  })

  it('normalizes decomposed Unicode (NFD) to precomposed NFC', () => {
    // 'e' + combining circumflex \u0302 + combining dot below \u0323
    const nfd = 'e\u0302\u0323'
    const state = applyTypedInput('v', 1, nfd)
    expect(state.input).toBe('vệ')
    expect(state.input.normalize('NFD')).not.toBe(state.input)
    expect(state.input).toBe('vệ'.normalize('NFC'))
  })

  it('inserts into middle of existing text', () => {
    const state = applyTypedInput('chào bạn', 4, ' tất cả')
    expect(state).toEqual({ input: 'chào tất cả bạn', caret: 11 })
  })
})
