import { useEffect, useRef, useState } from 'react'
import { IconLoader2, IconVolume, IconVolumeOff } from '@tabler/icons-react'
import { postBlob } from '@/lib/api'
import { cn } from '@/lib/utils'

function cleanMarkdownForSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' đoạn mã nguồn đã được lược bớt ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#~>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function SpeechButton({ text, className }: { text: string; className?: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setStatus('idle')
  }

  const speak = async () => {
    if (status === 'playing' || status === 'loading') {
      stop()
      return
    }

    const spokenText = cleanMarkdownForSpeech(text)
    if (!spokenText) return

    setStatus('loading')

    try {
      // 1. Thử gọi backend FPT.TTS-ultra / OpenAI Speech API
      const blob = await postBlob('speech', { text: spokenText })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onplay = () => setStatus('playing')
      audio.onended = () => {
        setStatus('idle')
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        fallbackWebSpeech(spokenText)
      }

      await audio.play()
    } catch {
      // 2. Dự phòng: Sử dụng Web Speech API của trình duyệt với giọng tiếng Việt
      fallbackWebSpeech(spokenText)
    }
  }

  const fallbackWebSpeech = (plainText: string) => {
    if (!('speechSynthesis' in window)) {
      setStatus('idle')
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(plainText)
    utteranceRef.current = utterance

    // Tìm giọng đọc tiếng Việt nếu có
    const voices = window.speechSynthesis.getVoices()
    const viVoice = voices.find((v) => v.lang.startsWith('vi') || v.lang.includes('VIE'))
    if (viVoice) utterance.voice = viVoice
    utterance.lang = 'vi-VN'
    utterance.rate = 1

    utterance.onstart = () => setStatus('playing')
    utterance.onend = () => setStatus('idle')
    utterance.onerror = () => setStatus('idle')

    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      type="button"
      onClick={speak}
      title={status === 'playing' ? 'Dừng đọc' : 'Nghe giọng đọc (FPT.TTS-ultra)'}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        status === 'playing' && 'text-primary font-medium bg-primary/10',
        className,
      )}
    >
      {status === 'loading' ? (
        <IconLoader2 className="size-3.5 animate-spin text-primary" stroke={2} />
      ) : status === 'playing' ? (
        <IconVolumeOff className="size-3.5 text-primary" stroke={2} />
      ) : (
        <IconVolume className="size-3.5" stroke={1.75} />
      )}
      <span>{status === 'playing' ? 'Dừng đọc' : status === 'loading' ? 'Đang đọc…' : 'Nghe đọc'}</span>
    </button>
  )
}
