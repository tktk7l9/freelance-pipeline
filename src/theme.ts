import { createTheme, type CSSVariablesResolver } from '@mantine/core'

/**
 * A ledger of cases. It is read for long stretches, so the base is a cool slate with a single indigo accent.
 * Colors are chosen so it is never confused with sumai-log (warm colors) side by side.
 *
 * Color is used only to express "state". Never for decoration.
 *   - indigo … where you are and what you can press (nav current location, primary button, links, focus ring)
 *   - slate (gray/dark) … everything else
 *   - red/orange/yellow and status colors are data representations from lib/deadlines and lib/status,
 *     not a second accent
 *
 * Values were measured before being written down (body 4.5:1 and UI 3:1 in both light and dark).
 * Main pairs:
 *   light  body #000/base gray0 19.4  dimmed gray6/base 5.11  border gray5/white 3.27
 *          filled indigo6/base 5.37  white text/indigo6 5.82
 *   dark   body dark0/base dark7 11.53  dimmed dark2/card dark6 5.82  border dark4/card 3.20
 *          filled indigo5/card 3.03  white text/indigo5 4.77
 */

/** Cool slate. Base, surfaces, borders, and subdued text all come from this one scale */
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

/** The only accent. An indigo leaning toward fountain-pen blue-black */
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

/** Night surfaces. 6 = card / 7 = base / 8 = sunken surface (.sunken) */
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
  // The default dark:8 is only 1.7:1 against the base, so button outlines vanish at night. 5 gives 3.55:1
  primaryShade: 5,
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
    // Chip content is just a status name or a date, so it is short. Mantine's default is max-width:100% and
    // overflow:hidden, so in a narrow table column "商談" gets cut to "商.." (a grid with overflow:hidden
    // has a min width of 0, so the column itself is allotted less than its content).
    // Do not truncate; size the column to its content instead
    Badge: {
      defaultProps: { radius: 'sm' },
      // Mantine's default uppercasing squashes skill names into "TYPESCRIPT".
      // What appears here are proper nouns, and the original spelling is correct
      styles: { root: { maxWidth: 'none', minWidth: 'max-content', textTransform: 'none' } },
    },
    Table: { defaultProps: { verticalSpacing: 'xs', horizontalSpacing: 'sm' } },
    // Every toast (saved / failed / undo) has an icon-only × button; give it a spoken name (SHIG 11, WCAG 4.1.2)
    Notification: { defaultProps: { closeButtonProps: { 'aria-label': '閉じる' } } },
  },
})

/**
 * Of the color variables Mantine builds, override only those that measured short.
 * The <style> MantineProvider writes comes after the links in head, so styles.css
 * cannot override them. This is the right entry point.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  // The color scheme is dark only (forceColorScheme). light is unused but left empty for the types
  light: {},
  dark: {
    // The default link color (indigo-4) is 4.04:1 on cards. indigo-3 gives 5.71:1
    '--mantine-color-anchor': ink[3],
  },
})
