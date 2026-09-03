/**
 * App-wide standard as of the color-consistency ticket: violet, matching
 * Feed and Messages (both independently confirmed against web's real live
 * source in earlier tickets — web's own lib/design/tokens.ts runs violet
 * for these surfaces, not the ink/ivory/gold/oxblood set this file carried
 * before). Rather than touch every screen's `colors.ink` / `colors.gold` /
 * `colors.oxblood` call sites individually, the VALUES behind these same
 * semantic keys were remapped to violet-family equivalents (see
 * `violetColors` below for the source values) — every existing screen
 * using `useTheme().colors` picks this up automatically. `gold`/`goldSoft`/
 * `goldDim` now hold violet accent shades (not literal gold), and
 * `oxblood`/`oxbloodSoft` hold red destructive-action shades (not literal
 * oxblood) — the key *names* stayed for now to avoid a mechanical rename
 * across every screen; a future pass could rename them to primary/
 * primarySoft/primaryDeep/danger/dangerSoft for honesty, flagged here
 * rather than done silently as part of this pass.
 */
export const colors = {
  ink: '#1B1523',
  inkSoft: '#645C74',
  ivory: '#FAF8FC',
  ivoryDeep: '#F2EBFC',
  paper: '#FFFFFF',
  gold: '#6D28D9',
  goldSoft: '#A78BFA',
  goldDim: '#4C1D95',
  oxblood: '#DC2626',
  oxbloodSoft: '#F87171',
  line: '#EBE6F3',
  lineStrong: '#DDD5EC',
  /**
   * The web app's actual active/selected NAVIGATION state — not a content
   * accent. Sourced directly from components/layout/Header.tsx's persistent
   * top nav (`border-violet-600 text-violet-600` on every active item) via
   * the installed tailwindcss/colors.js violet-600 value, confirmed on the
   * "truncated bottom nav labels + icon weight" ticket rather than reused
   * from `gold` above (violet-700, sourced from Feed/Chat content styling,
   * not the nav bar). Use this specifically for nav/tab-bar active state;
   * `gold` remains correct for non-nav violet accents.
   */
  navActive: '#7C3AED',
} as const;

export type ColorToken = keyof typeof colors;

/**
 * The real, live violet source values (web's lib/design/tokens.ts `T`,
 * confirmed by reading app/feed/page.tsx, components/posts/PostCard/**,
 * app/chat/page.tsx, and components/chat/** directly) that `colors` above
 * is now remapped from. Feed/Messages import this directly rather than
 * going through the renamed-but-violet `colors` keys above; new
 * violet-system code can use either — this is the more honestly-named one.
 */
export const violetColors = {
  ink: '#1B1523',
  inkSoft: '#645C74',
  inkFaint: '#9992A6',
  canvas: '#FAF8FC',
  surface: '#FFFFFF',
  line: '#EBE6F3',
  lineStrong: '#DDD5EC',
  primary: '#6D28D9',
  primaryDeep: '#4C1D95',
  primarySoft: '#F2EBFC',
  pink: '#DB2777',
  pinkSoft: '#FCE7F3',
  amber: '#B45309',
  amberSoft: '#FEF3C7',
  amberLine: '#F5D38A',
  green: '#15803D',
  greenSoft: '#E9F7EE',
} as const;

export type VioletColorToken = keyof typeof violetColors;
