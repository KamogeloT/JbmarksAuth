import { useEffect, useRef, useCallback } from 'react'

/**
 * Auto-refresh hook — polls at a set interval
 * Pauses when the browser tab is not visible
 */
export function useAutoRefresh(callback: () => void, intervalMs: number = 30000) {
  const savedCallback = useRef(callback)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  const start = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      savedCallback.current()
    }, intervalMs)
  }, [intervalMs])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    start()

    const handleVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        savedCallback.current()
        start()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [start, stop])
}
