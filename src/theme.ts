import { createTheme, type CSSVariablesResolver } from '@mantine/core'

/**
 * 案件の台帳。読む時間が長いので、地は寒色のスレート、アクセントは藍 1 色。
 * 住まいログ（暖色）と並べても取り違えない配色にする。
 *
 * 色は「状態」を表すためだけに使う。飾りには使わない。
 *   - 藍（indigo）… 今どこにいるか・何を押せるか（ナビの現在地・主ボタン・リンク・焦点リング）
 *   - スレート（gray/dark）… それ以外すべて
 *   - 赤/橙/黄・ステータス色は lib/deadlines・lib/status のデータ表現であって、
 *     2 本目のアクセントではない
 *
 * 数値は実測してから載せた（本文 4.5:1・UI 3:1 をライト/ダーク両方で満たす）。
 * 主な組：
 *   ライト  本文#000/地gray0 19.4  dimmed gray6/地 5.11  罫線gray5/白 3.27
 *           filled indigo6/地 5.37  白文字/indigo6 5.82
 *   ダーク  本文dark0/地dark7 11.53  dimmed dark2/カードdark6 5.82  罫線dark4/カード 3.20
 *           filled indigo5/カード 3.03  白文字/indigo5 4.77
 */

/** 寒色のスレート。地・面・罫線・控えめな文字はすべてこの 1 本から採る */
const slate = [
  '#f4f6f9',
  '#e9edf3',
  '#dae1ea',
  '#c5cedb',
  '#adb8c8',
  '#828fa6',
  '#5d6980',
  '#475266',
  '#333d4d',
  '#222b38',
] as const

/** 唯一のアクセント。万年筆のブルーブラック寄りの藍 */
const ink = [
  '#eef1fd',
  '#dbe1fa',
  '#b5c2f3',
  '#8d9feb',
  '#6b81e3',
  '#5069dd',
  '#3f58d9',
  '#3148c0',
  '#293dab',
  '#1f3095',
] as const

/** 夜の面。6=カード / 7=地 / 8=沈めた面（.sunken） */
const night = [
  '#cdd6e2',
  '#b3bdcd',
  '#9aa5b8',
  '#7b8699',
  '#6b778d',
  '#3a4352',
  '#222a36',
  '#171d27',
  '#12171f',
  '#0d1119',
] as const

export const theme = createTheme({
  primaryColor: 'indigo',
  // 既定の dark:8 は地との差が 1.7:1 しか出ず、ボタンの輪郭が夜に消える。5 なら 3.55:1
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'md',
  respectReducedMotion: true,
  colors: {
    gray: [...slate],
    indigo: [...ink],
    dark: [...night],
  },
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", Meiryo, "Segoe UI", sans-serif',
  fontSizes: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
  lineHeights: { xs: '1.5', sm: '1.6', md: '1.7', lg: '1.6', xl: '1.5' },
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '1.5rem', lineHeight: '1.35' },
      h2: { fontSize: '1.1875rem', lineHeight: '1.45' },
      h3: { fontSize: '1.0625rem', lineHeight: '1.5' },
    },
  },
  components: {
    TextInput: { defaultProps: { size: 'md' } },
    NumberInput: { defaultProps: { size: 'md' } },
    Textarea: { defaultProps: { size: 'md' } },
    Select: { defaultProps: { size: 'md' } },
    TagsInput: { defaultProps: { size: 'md' } },
    Button: { defaultProps: { size: 'md' } },
    // チップの中身はステータス名と日付だけで短い。Mantine 既定は max-width:100% と
    // overflow:hidden で、表の狭い列だと「商談」が「商..」に削られる（overflow:hidden の
    // グリッドは最小幅が 0 になるので、列そのものが中身より狭く配られてしまう）。
    // 削らず、列の方を中身に合わせる
    Badge: {
      defaultProps: { radius: 'sm' },
      // Mantine 既定の大文字化はスキル名を「TYPESCRIPT」に潰してしまう。
      // ここに出るのは固有名詞そのもので、表記は原文どおりが正しい
      styles: { root: { maxWidth: 'none', minWidth: 'max-content', textTransform: 'none' } },
    },
    Table: { defaultProps: { verticalSpacing: 'xs', horizontalSpacing: 'sm' } },
  },
})

/**
 * Mantine が組み立てる色変数のうち、実測して足りなかったものだけ差し替える。
 * MantineProvider が書き出す <style> は head のリンクより後に来るので、
 * styles.css からでは上書きできない。こちらが正しい入口。
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    // 地は白ではなく寒色の紙。白いカードが影なしで浮き上がる
    '--mantine-color-body': slate[0],
    // 既定の gray-4 は白カードとの差が 2.2:1。gray-5 なら 3.27:1
    '--mantine-color-default-border': slate[5],
    // light 変種のチップの文字色。既定の {色}-9 は {色}-1 の地に対して
    // 橙 3.62:1・黄 2.69:1・青緑 4.33:1 しか出ない。色味は保ったまま暗い側へ寄せる
    '--mantine-color-orange-light-color': '#b3380a',
    '--mantine-color-yellow-light-color': '#9a5000',
    '--mantine-color-teal-light-color': '#0a6b4d',
  },
  dark: {
    // 既定のリンク色（indigo-4）はカードの上で 4.04:1。indigo-3 なら 5.71:1
    '--mantine-color-anchor': ink[3],
  },
})
