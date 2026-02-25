import type { Facet } from '@/db/types'
import './FacetChip.css'

export type ChipVariant = 'filter' | 'card' | 'detail'

interface Props {
  facet: Facet
  variant?: ChipVariant
  active?: boolean
  pinned?: boolean
  onPin?: () => void
  onClick?: () => void
  onRemove?: () => void
}

export function FacetChip({ facet, variant = 'card', active, pinned, onPin, onClick, onRemove }: Props) {
  return (
    <span
      className={`facet-chip facet-chip--${variant}${active ? ' facet-chip--active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={facet.label}
    >
      {facet.label}
      {variant === 'detail' && onPin && (
        <button
          className={`chip-pin${pinned ? ' chip-pin--active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onPin() }}
          title={pinned ? 'Unpin' : 'Pin to card'}
          aria-label={pinned ? 'Unpin facet' : 'Pin facet'}
        >
          ★
        </button>
      )}
      {variant === 'filter' && onRemove && (
        <button
          className="chip-remove"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          aria-label={`Remove ${facet.label} filter`}
        >
          ×
        </button>
      )}
    </span>
  )
}
