/**
 * Colour and motion for the "agent is working" line. Pure functions of the
 * animation frame, so the look can be tested without rendering a terminal.
 */

/** HSL (h in degrees, s and l in 0..1) to a `#rrggbb` string. */
export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): string => {
    const k = (n + hue / 30) % 12
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

/** Hue shift per frame, and per character along the line, in degrees. */
const HUE_PER_FRAME = 18
const HUE_PER_CHAR = 12

/**
 * Colour of the character at `index` on a given frame. Neighbouring characters
 * differ slightly and every frame moves the whole pattern, so a rainbow appears
 * to travel along the text.
 */
export function waveColor(index: number, frame: number): string {
  return hslToHex(frame * HUE_PER_FRAME + index * HUE_PER_CHAR, 0.75, 0.72)
}

/** Dots that grow one by one and reset, always three columns wide so the line never shifts. */
export function dots(frame: number): string {
  return '.'.repeat(frame % 4).padEnd(3)
}
