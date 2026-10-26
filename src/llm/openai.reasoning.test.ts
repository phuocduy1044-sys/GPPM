import { describe, it, expect } from 'vitest'
import { echoesReasoning, supportsDeepSeekVision, toOpenAIMessages } from './openai.js'
import type { ProviderEntry } from '../config.js'
import type { OllamaMessage } from './types.js'

const entry = (baseUrl: string) => ({ type: 'openai', baseUrl }) as ProviderEntry

const history: OllamaMessage[] = [
  { role: 'user', content: 'read a.txt' },
  {
    role: 'assistant',
    content: '',
    reasoning_content: 'I should read the file.',
    tool_calls: [{ id: 'c1', function: { name: 'read_file', arguments: { path: 'a.txt' } } }],
  },
  { role: 'tool', content: 'hello', tool_call_id: 'c1' },
  { role: 'assistant', content: 'It says hello.', reasoning_content: 'Done.' },
  { role: 'assistant', content: 'older turn, no reasoning recorded' },
]

describe('echoesReasoning', () => {
  it('is on for DeepSeek, which rejects tool requests without it', () => {
    expect(echoesReasoning(entry('https://api.deepseek.com'))).toBe(true)
    expect(echoesReasoning(entry('https://eu.api.deepseek.com/v1'))).toBe(true)
  })

  it('is off elsewhere, where the field would be ignored or rejected', () => {
    expect(echoesReasoning(entry('https://api.openai.com'))).toBe(false)
    expect(echoesReasoning(entry('http://localhost:1234'))).toBe(false)
    expect(echoesReasoning(entry('https://notdeepseek.com'))).toBe(false)
    expect(echoesReasoning(entry('not a url'))).toBe(false)
  })
})

describe('toOpenAIMessages reasoning', () => {
  it('hands reasoning back on every assistant turn when asked to', () => {
    const out = toOpenAIMessages(history, true) as Array<Record<string, unknown>>
    expect(out[1].reasoning_content).toBe('I should read the file.')
    expect(out[3].reasoning_content).toBe('Done.')
  })

  it('sends an empty string for an assistant turn with no recorded reasoning', () => {
    const out = toOpenAIMessages(history, true) as Array<Record<string, unknown>>
    expect(out[4].reasoning_content).toBe('')
  })

  it('leaves user and tool messages alone', () => {
    const out = toOpenAIMessages(history, true) as Array<Record<string, unknown>>
    expect(out[0]).not.toHaveProperty('reasoning_content')
    expect(out[2]).not.toHaveProperty('reasoning_content')
  })

  it('sends no reasoning field at all by default', () => {
    for (const m of toOpenAIMessages(history) as Array<Record<string, unknown>>) {
      expect(m).not.toHaveProperty('reasoning_content')
    }
  })
})

describe('DeepSeek Flash vision', () => {
  it('enables images only for DeepSeek Flash endpoints', () => {
    expect(supportsDeepSeekVision(entry('https://api.deepseek.com'), 'deepseek-flash')).toBe(true)
    expect(supportsDeepSeekVision(entry('https://eu.api.deepseek.com/v1'), 'deepseek-flash')).toBe(true)
    expect(supportsDeepSeekVision(entry('https://api.deepseek.com'), 'deepseek-v4-pro')).toBe(false)
    expect(supportsDeepSeekVision(entry('https://api.openai.com'), 'deepseek-flash')).toBe(false)
  })

  it('encodes attached user images as OpenAI-compatible image_url parts', () => {
    const messages = toOpenAIMessages([
      { role: 'user', content: 'What is in this picture?', images: ['iVBORw0KGgo='] },
    ], false, true) as Array<{ role: string; content: unknown }>

    expect(messages[0].content).toEqual([
      { type: 'text', text: 'What is in this picture?' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } },
    ])
  })
})
