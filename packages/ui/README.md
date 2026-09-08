# @repo/ui

Shared shadcn components and the Lycoris design system. Apps import components from
`@repo/ui/components/*` and the theme from `@repo/ui/globals.css`.

The visual reference is [Pleurat](https://www.pleurat.com/): warm paper, ink,
amber, General Sans, square panels, fine borders, and spacious editorial type.
Lycoris keeps its own content and checkout interaction.

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#FFFCF0` | `#13120D` |
| Foreground | `#16140E` | `#F1EEE6` |
| Card | `#FFFDF3` | `#17160E` |
| Muted text | `#57534A` | `#A4A097` |
| Primary | `#F3B44A` | `#F3B44A` |
| Border | ink at 16% | paper at 24% |

The radius token is zero. Buttons and inputs use a 46px default height; small
controls use 34px. Circular status icons and the theme icon remain circular.
General Sans is loaded once through `DesignFonts` in the host layout, from
Fontshare. Helvetica/system sans is the fallback if the external font is unavailable.
Headings use weight 500, line height 1.04, and tracking -0.03em. Display size scales
from 37px to 64px. Body and small sizes are 17px and 15px. Labels use small uppercase
text with tracking. Use semantic tokens rather than app-local palette overrides.

Wrap the app in `ThemeProvider` and mount `ThemeToggle` in navigation. The provider
supports system preferences; Lycoris chooses dark as its initial default and stores
manual selection under `lycoris-theme`. Both themes have visible keyboard focus and
reduced-motion support.

Tailwind CSS 4.3.3 owns component styling. Use `text-display`, `text-section`,
`text-body`, `text-small`, and semantic color utilities; shared CSS contains only
theme tokens and base accessibility defaults. Layouts and state variants live
in component utility strings, with no CSS modules. Add new shadcn components with
`bun run ui:add -- <component>` from the repository root.

The independently distributable Settle Kit does not import this package. The host
passes shared CSS variables through the SDK appearance API, so other merchants can
use a different design system without inheriting Lycoris styling or dependencies.
