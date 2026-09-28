import { Anchor, Text } from '@mantine/core'
import { ExternalLink } from 'lucide-react'

/**
 * Company name. If there is an official-site URL (companies table), render an external link
 * that opens in a new tab; otherwise plain text.
 *
 * `nested` is for places where the whole card is a <Link> (<a>). An <a> cannot contain an <a>
 * (invalid HTML, and the outer <a> gets closed while the SSR HTML is parsed), so there it
 * becomes <span role="link"> and opens with window.open. Clicks do not propagate to the
 * parent link.
 */
export function CompanyName({
  name,
  url,
  nested = false,
  size,
  c,
}: {
  name: string
  url?: string | null
  nested?: boolean
  size?: string
  c?: string
}) {
  if (!url) {
    return (
      <Text span size={size} c={c} inherit={size === undefined && c === undefined}>
        {name}
      </Text>
    )
  }
  const style = { display: 'inline-flex', alignItems: 'center', gap: 3 } as const
  const icon = <ExternalLink size={12} aria-label="（公式サイト）" />
  if (nested) {
    const open = () => window.open(url, '_blank', 'noopener,noreferrer')
    return (
      <Anchor
        component="span"
        role="link"
        tabIndex={0}
        size={size}
        c={c}
        underline="always"
        style={style}
        className="hotspot"
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
        {name}
        {icon}
      </Anchor>
    )
  }
  return (
    <Anchor
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      size={size}
      c={c}
      underline="always"
      style={style}
      className="hotspot"
      onClick={(e) => e.stopPropagation()}
    >
      {name}
      {icon}
    </Anchor>
  )
}
