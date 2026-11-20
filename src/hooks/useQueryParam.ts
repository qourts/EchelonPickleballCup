import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** A filter that lives in the URL (so it survives refreshes and can be shared) and falls back safely. */
export function useQueryParam<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(key)
  const value = allowed.find((option) => option === raw) ?? fallback

  const set = useCallback(
    (next: T) => {
      setParams(
        (previous) => {
          const copy = new URLSearchParams(previous)
          copy.set(key, next)
          return copy
        },
        { replace: true },
      )
    },
    [key, setParams],
  )
  return [value, set]
}
