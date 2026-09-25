import { Anchor, Text } from '@mantine/core'
import { MapPin } from 'lucide-react'

import { mapsUrl } from '../lib/format'

/**
 * 作業場所。住所があれば Google マップを新しいタブで開く。
 * `nested` はカード全体が <Link> の場所用（<a> の入れ子を避けて span role=link にする。CompanyName と同じ）。
 */
export function PlaceLink({
  address,
  nested = false,
  size,
}: {
  address: string | null | undefined
  nested?: boolean
  size?: string
}) {
  const url = mapsUrl(address)
  if (!url || !address) {
    return (
      <Text span size={size} inherit={size === undefined}>
        {address ?? '—'}
      </Text>
    )
  }
  const style = { display: 'inline-flex', alignItems: 'flex-start', gap: 3 } as const
  const icon = (
    <MapPin
      size={12}
      aria-label="（Google マップで開く）"
      style={{ flexShrink: 0, marginTop: 3 }}
    />
  )
  if (nested) {
    const open = () => window.open(url, '_blank', 'noopener,noreferrer')
    return (
      <Anchor
        component="span"
        role="link"
        tabIndex={0}
        size={size}
        underline="always"
        style={style}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          open()
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          e.stopPropagation()
          open()
        }}
      >
        {icon}
        <span>{address}</span>
      </Anchor>
    )
  }
  return (
    <Anchor
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      size={size}
      underline="always"
      style={style}
    >
      {icon}
      <span>{address}</span>
    </Anchor>
  )
}
