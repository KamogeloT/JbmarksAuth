/**
 * Alert sounds for network monitoring
 * Uses Web Audio API — no external files needed
 */

let audioContext: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioContext.state === 'suspended') audioContext.resume()
  return audioContext
}

/** Urgent alarm — triple beep when a node goes DOWN */
export function playAlertSound() {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'square'
      osc.frequency.value = 800

      const start = now + i * 0.2
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02)
      gain.gain.setValueAtTime(0.3, start + 0.1)
      gain.gain.linearRampToValueAtTime(0, start + 0.15)

      osc.start(start)
      osc.stop(start + 0.15)
    }
  } catch { /* silent fail */ }
}

/** Soft confirmation beep */
export function playConfirmSound() {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(523, ctx.currentTime)
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15)

    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch { /* silent fail */ }
}
