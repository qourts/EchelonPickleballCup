import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui.tsx'

export function NotFound() {
  return (
    <>
      <PageHeader eyebrow="404" title="We couldn't find that page" lead="The page may have moved, or the link may be mistyped." />
      <p className="actions">
        <Link className="button button-primary" to="/">
          Back to home
        </Link>
        <Link className="button button-ghost" to="/guide">
          Player Guide
        </Link>
      </p>
    </>
  )
}
