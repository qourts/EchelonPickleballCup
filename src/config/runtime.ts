/**
 * The portal's notion of "now". Production always uses the real clock. Only the development
 * server honours `?now=<ISO instant>` so each publication phase can be previewed; that code
 * is removed from production builds.
 */
export function currentTime(): Date {
  if (import.meta.env.DEV) {
    const requested = new URLSearchParams(window.location.search).get('now')
    const parsed = requested ? new Date(requested) : null
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}
