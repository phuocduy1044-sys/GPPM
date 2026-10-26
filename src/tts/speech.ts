import OpenAI from 'openai'
import { loadConfig } from '../config.js'

export interface SpeechRequest {
  text: string
  voice?: string
  speed?: number
  apiKey?: string
  baseURL?: string
  model?: string
}

/**
 * Tạo âm thanh từ văn bản sử dụng FPT.TTS-ultra hoặc OpenAI-compatible Speech API.
 */
export async function generateSpeech({
  text,
  voice = 'fci_xuantoan',
  speed = 1,
  apiKey,
  baseURL,
  model = 'FPT.TTS-ultra',
}: SpeechRequest): Promise<{ buffer: Buffer; contentType: string }> {
  const cfg = loadConfig()
  const key = apiKey || process.env.FPT_API_KEY || cfg.providers?.fpt?.apiKey || cfg.providers?.fptcloud?.apiKey || process.env.OPENAI_API_KEY

  if (!key) {
    throw new Error('Chưa có API Key cho dịch vụ Speech/TTS. Vui lòng nhập API Key trong cấu hình mô hình.')
  }

  const endpoint = baseURL || cfg.providers?.fpt?.baseUrl || cfg.providers?.fptcloud?.baseUrl || 'https://mkp-api.fptcloud.com'
  
  const client = new OpenAI({
    apiKey: key,
    baseURL: endpoint,
  })

  // Gọi API Audio Speech tương thích OpenAI & FPT Cloud
  const response = await client.audio.speech.create({
    model,
    input: text.slice(0, 4096),
    response_format: 'mp3',
    voice: voice as any,
    speed,
  } as any)

  const arrayBuffer = await response.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: 'audio/mpeg',
  }
}
