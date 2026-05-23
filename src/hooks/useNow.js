import { useState, useEffect } from 'react'

// Current time in ms, refreshed on an interval so "due" states update
// without a manual reload.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
