import { useEffect, useRef, useState } from 'react'
import {
  accrue,
  clamp,
  defaultPortfolio,
  type ActionResult,
  type Portfolio,
} from './engine'
import { loadPortfolio, savePortfolio } from './storage'

export function useBook() {
  const [book, setBook] = useState<Portfolio>(() => defaultPortfolio())
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const booted = useRef(false)
  const seen = useRef<string | null>(null)

  useEffect(() => {
    setBook(loadPortfolio())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    savePortfolio(book)
  }, [book, hydrated])

  useEffect(() => {
    const id = window.setInterval(() => {
      setBook((current) => accrue(current, Date.now()))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const top = book.log[0]?.id ?? null
    if (!booted.current) {
      booted.current = true
      seen.current = top
      return
    }
    if (top && top !== seen.current) setFlashId(top)
    seen.current = top
  }, [book, hydrated])

  useEffect(() => {
    if (!flashId) return
    const t = window.setTimeout(() => setFlashId(null), 1700)
    return () => window.clearTimeout(t)
  }, [flashId])

  function commit(run: (current: Portfolio) => ActionResult) {
    const preview = run(book)
    if (preview.error) {
      setError(preview.error)
      return
    }
    setError(null)
    setBook((current) => {
      const result = run(current)
      return result.error ? current : result.portfolio
    })
  }

  function patch(
    partial: Partial<
      Pick<Portfolio, 'holdAprPct' | 'gaugeAprPct' | 'reserveMusd' | 'maxStakePct' | 'kill'>
    >,
  ) {
    setError(null)
    setBook((current) => ({
      ...current,
      ...partial,
      holdAprPct:
        partial.holdAprPct === undefined ? current.holdAprPct : clamp(partial.holdAprPct, 0, 100),
      gaugeAprPct:
        partial.gaugeAprPct === undefined ? current.gaugeAprPct : clamp(partial.gaugeAprPct, 0, 200),
      reserveMusd:
        partial.reserveMusd === undefined
          ? current.reserveMusd
          : clamp(partial.reserveMusd, 0, 1_000_000_000),
      maxStakePct:
        partial.maxStakePct === undefined ? current.maxStakePct : clamp(partial.maxStakePct, 0, 100),
    }))
  }

  function reset() {
    if (!window.confirm('Reset the simulated book and clear the epoch log in this browser?')) return
    setError(null)
    setBook(defaultPortfolio())
  }

  return { book, error, flashId, commit, patch, reset }
}
