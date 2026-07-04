/**
 * Notification Sound — plays a short beep when notifications are triggered
 * Uses the Web Audio API (no external sound files needed)
 */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

/** Play a short notification beep */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Two-tone beep (like a phone notification)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
    oscillator.frequency.setValueAtTime(1174, ctx.currentTime + 0.1) // D6

    // Volume envelope — quick fade in/out
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1)
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.12)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.25)
  } catch (e) {
    // Silently fail if audio isn't available
    console.warn('Could not play notification sound:', e)
  }
}
