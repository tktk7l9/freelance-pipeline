import { Anchor, Text } from '@mantine/core'
import { ExternalLink } from 'lucide-react'

/**
 * 会社名。公式サイトの URL（companies 表）があれば新しいタブで開く外部リンクにし、
 * 無ければ文字だけ。
 *
 * `nested` はカード全体が <Link>（<a>）になっている場所用。<a> の中に <a> は置けない
 * （HTML として不正で、SSR の HTML を読む段階で外側の <a> が閉じられてしまう）ので、
 * そこでは <span role="link"> にして window.open で開く。クリックは親のリンクに
 * 伝播させない。
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
      onClick={(e) => e.stopPropagation()}
    >
      {name}
      {icon}
    </Anchor>
  )
}
