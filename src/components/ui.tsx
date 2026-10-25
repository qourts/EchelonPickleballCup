import type { ReactNode } from 'react'
import { EVENT } from '../config/event.ts'
import { ExternalIcon } from './icons.tsx'

export function PageHeader({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: ReactNode }) {
  return (
    <header className="page-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
    </header>
  )
}

export function RegisterButton({ variant = 'primary', label = 'Register now' }: { variant?: 'primary' | 'ghost'; label?: string }) {
  return (
    <a
      className={`button button-${variant}`}
      href={EVENT.registrationUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
      <ExternalIcon />
      <span className="visually-hidden"> (opens the organizer&apos;s registration form in a new tab)</span>
    </a>
  )
}

type Tone = 'neutral' | 'gold' | 'blue' | 'ok' | 'warn' | 'live'

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'gold'
  title?: string
  children: ReactNode
}) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'warn' ? 'alert' : 'note'}>
      {title && <p className="notice-title">{title}</p>}
      <div>{children}</div>
    </div>
  )
}

export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  )
}

export interface SegmentOption<T extends string> {
  readonly value: T
  readonly label: string
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segment"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
