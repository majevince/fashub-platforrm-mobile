# FaSHub Pages — Architecture (Data Layer + Web/Mobile)

Status: **draft for review** — built from the "FaSHub Pages — Implementation
Prompts" spec (pasted 2026-09-26) plus direct inspection of this repo and the
locked mock at `~/Downloads/FaSHub Page Profile Mockup.html`. Everything
under "Verified against the repo" below is a fact I confirmed by reading
actual files, not an assumption carried over from the spec. Everything under
"Not verifiable from this workspace" is a real gap: this repo contains only
`apps/mobile` and the shared `packages/*` — there is no web/Next.js app and
no backend/migrations directory here, so Prompt A and Prompt B's Step 0
investigations cannot be completed from this checkout. Whoever runs Prompt A
needs the actual backend repo open.

---

## 0. What's actually in the mock (decoded, not guessed)

The `.html` file isn't a plain mockup — it's an exported Claude Design
canvas: a self-executing bundle whose real content is a gzip+base64 blob
embedded in a `script[type="__bundler/template"]` tag per artboard. Decoding
it (see `/tmp/mock_public.html` / `/tmp/mock_manage.html` extraction — not
committed, regenerate with the snippet in the Appendix if needed) recovered
the two real artboards: **`Main.dc.html`** (public view, links to
`Manage.dc.html`) and **`Manage.dc.html`** (admin view, links back to
`Main.dc.html`). Both are 390×844 (standard phone canvas), and — good news —
**the mock already uses FaSHub's real font stack**: `@font-face` blocks for
Fraunces (500/600/700), Inter (400/500/600/700), and Space Mono (400/700),
the same three families `packages/design-tokens/src/typography.ts` declares.
So "use the FaSHub fonts" is already true of the mock; the work is carrying
that into React Native (`fontFamilies.serif` / `.sans` / `.mono`, not raw
`font-family` strings) and into web's own token file.

**Palette actually used in the mock** (both artboards, counted directly from
the decoded HTML):

| Hex | Role in the mock |
|---|---|
| `#141210` | ink — header bar bg, primary text, avatar-placeholder bg |
| `#F6F1E6` | ivory/paper — page background, header text color |
| `#C6A15B` | **gold** — wordmark, verified-business badge, avatar initials, highlights-ring border, pinned-post accent, "Verified" checkmark in settings, upgrade-card border/CTA |
| `#6E1F2A` | **oxblood** — handle/type line under the name, deactivate-Page border+text, hero placeholder-stripe accent |
| `#6D28D9` | **violet** — primary CTA fill ("Book a Fitting"), active tab underline, header avatar circle, "posting as" avatar circle, shared-inbox count badge |
| `#2f6b3a` | green — "+18%" positive stat delta (Manage view only) |

Five colors doing five distinct jobs in the same screen. That matters — see
§3 below, because it directly conflicts with the current mobile token file.

**Structure, public view** (`Main.dc.html`), top to bottom: sticky dark
header (hamburger, "FaSHub" wordmark in gold Fraunces, bell, avatar) → hero
stripe (diagonal ink/oxblood pattern, dashed gold bottom border) → avatar
(overlapping the hero, ink circle, gold Fraunces initials) → name + gold
verified-badge (custom checkmark glyph, not the app's violet
`VerifiedBadge`) → `@handle · Type · Subtype` in oxblood Space Mono → tagline
→ location (pin icon + "+1 more location") → stat row (`12.4K Followers ·
86 Posts · 14 People`, Space Mono) → CTA row (violet primary CTA, outlined
Follow, outlined Message icon, outlined "more" kebab) → horizontal tab strip
(`Home / About / Posts / Collections / Shop / Services / People / Reviews`,
Space Mono uppercase, violet underline on active) → horizontal "highlights"
rail (3 circular ring items — gold ring, no text truncation) → pinned-post
card (gold "Pinned" label + icon, actor row, body text, placeholder media,
like/comment/repost counts) → "Recent activity" section header (Fraunces) →
plain post card → a review-style card (oxblood-tinted avatar, italic quote)
→ dashed-border "Admin view → Manage this Page" link (dev/preview-only nav,
not a real product affordance — confirms `Main.dc.html`/`Manage.dc.html` are
literally two states of one screen, not two unrelated designs).

**Structure, admin view** (`Manage.dc.html`): sticky dark header (back
chevron, "Manage {name}" in Fraunces) → "Posting as" card (ink bg, violet
avatar circle, name, chevron to switch — this *is* the identity switcher
entry point, rendered inline on this screen rather than as a global
header dropdown) → "This week" stats card (views / delta / new-followers,
Space Mono numbers, green delta, "View full analytics →" violet link) →
"Admins & roles" section: three rows, each an avatar + name (+"(You)" on
self) + a role pill on the right — **Super Admin pill is oxblood-filled**,
every other role pill is a neutral ink-on-10%-opacity chip. That's a real,
specific visual rule: only the Super Admin role gets a colored pill; every
other role (Content Admin, Commerce Mgr in this mock — Recruiter/Analyst not
shown but same treatment implied) gets the same neutral chip → "Page
settings" list: Edit Page info / Verification status (shows "Verified" +
gold check when applicable) / Roles & permissions / Shared inbox (violet
count badge) / Boost a post → gold-bordered upsell card ("Upgrade to
Business") → oxblood-outlined "Deactivate Page" at the bottom.

Nothing in either screen renders Standard/Creator-Pro-gated empty states,
disabled rows, or the Shop/Services/People/Reviews tab bodies — the mock
shows the **fully unlocked, Business-tier, all-8-tabs** state throughout.
That's expected (a mock shows the ceiling), but it means neither artboard
answers open question §7.6 (mobile tab scope) or shows what a Standard-tier
Page's own manage screen looks like with Event/Project/Community creation
disabled — Prompt B/C's agents still have to design those states from the
written spec's tier rules, not from the mock.

---

## 1. Critical finding: the mock's palette doesn't match the current mobile token file

**Verified against the repo.** `packages/design-tokens/src/colors.ts`
documents an explicit, deliberate remap:

```ts
export const colors = {
  ink: '#1B1523',
  ...
  gold: '#6D28D9',      // ← violet, not gold. Renamed in-place for Feed/Messages.
  goldSoft: '#A78BFA',
  goldDim: '#4C1D95',
  oxblood: '#DC2626',    // ← red, not oxblood.
  oxbloodSoft: '#F87171',
  ...
} as const;
```

The file's own comment explains why: Feed and Messages were confirmed
against web's live `lib/design/tokens.ts` to be violet-monotone, so rather
than touch every `colors.gold`/`colors.oxblood` call site, the *values*
behind those two keys were repointed to violet/red shades. The comment
explicitly flags this as scoped to "these same semantic keys," implying
other surfaces may still legitimately want literal gold/oxblood — it just
never had to be resolved because nothing after that remap needed the literal
colors again. **Pages is the first surface since that remap that needs
literal gold (`#C6A15B`) and literal oxblood (`#6E1F2A`) simultaneously with
violet (`#6D28D9`)**, exactly as the mock uses all three side by side (gold
verified badge next to a violet CTA button, for instance). Calling
`colors.gold` for the Pages verified badge would silently render it violet —
wrong, and easy to miss in review since it wouldn't error, just look like a
slightly different design decision.

There's a second, independently-confirmed mismatch: `VerifiedBadge.tsx`
(the app's one real verified-badge component, ported 1:1 from web) is
violet-filled with a white check — and its own header comment says "Do NOT
change this color/icon (explicit brand requirement)." The Pages spec
*already* calls for the Page badge to be "visually distinct from the
personal verified badge" (§3) — the mock's gold badge satisfies that
requirement, it just can't be built by recoloring `VerifiedBadge`, it needs
a sibling component.

**Recommendation** (flag for confirmation, folded into §7's open-questions
list below): add a small, honestly-named token set for this literal
five-color palette, following the exact precedent `violetColors` already
set in the same file (a parallel export, not a repurposing of `colors`):

```ts
// packages/design-tokens/src/colors.ts
export const pageColors = {
  ink: '#141210',
  ivory: '#F6F1E6',
  gold: '#C6A15B',
  oxblood: '#6E1F2A',
  violet: '#6D28D9', // same value as colors.gold today — same source, still worth its own honest name here
} as const;
export type PageColorToken = keyof typeof pageColors;
```

Re-export it from `packages/design-tokens/src/index.ts` next to
`violetColors`. Mobile's Pages screens import `pageColors`, never
`colors.gold`/`colors.oxblood`. Web needs the equivalent literal values
added to `lib/design/tokens.ts` (can't confirm current contents from this
workspace — flagged for the agent holding that repo). A `PagesVerifiedBadge`
component (gold circle, same checkmark path as the mock, distinct file from
`VerifiedBadge.tsx`) ships alongside it.

---

## 2. Data layer

### 2.1 Schema (Postgres — table shapes as specified, refined with FK/index notes)

```sql
CREATE TYPE page_type AS ENUM (
  'brand_label', 'atelier_tailoring_house', 'design_studio', 'boutique_retailer',
  'fabric_trims_supplier', 'manufacturer_production_house', 'agency',
  'fashion_school_academy', 'publication_media', 'event_organizer'
);

CREATE TYPE page_verification_status AS ENUM (
  'unverified', 'pending', 'domain_verified', 'business_verified'
);

CREATE TYPE page_tier AS ENUM ('standard', 'creator_pro', 'business_pro');

CREATE TYPE page_admin_role AS ENUM (
  'super_admin', 'content_admin', 'commerce_manager', 'recruiter', 'analyst'
);

CREATE TABLE pages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle               VARCHAR(50) UNIQUE NOT NULL,
  name                 VARCHAR(120) NOT NULL,
  type                 page_type NOT NULL,
  tagline              VARCHAR(160),
  about                TEXT,
  logo_asset_id        UUID REFERENCES assets(id),
  cover_asset_id       UUID REFERENCES assets(id),
  verification_status  page_verification_status NOT NULL DEFAULT 'unverified',
  tier                 page_tier NOT NULL DEFAULT 'standard',
  tier_renews_at       TIMESTAMPTZ,
  cta_type             VARCHAR(30), -- 'book_fitting' | 'message' | 'shop' | 'request_quote' | 'visit_website' | null
  cta_url              TEXT,        -- only meaningful for 'visit_website'/'shop' until Shop ships
  created_by_user_id   UUID NOT NULL REFERENCES users(id),
  deactivated_at       TIMESTAMPTZ, -- soft delete: keeps handle/history, hides everywhere public
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pages_type_idx ON pages(type) WHERE deactivated_at IS NULL;
CREATE INDEX pages_tier_idx ON pages(tier);

CREATE TABLE page_admins (
  page_id            UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role               page_admin_role NOT NULL,
  invited_by_user_id UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, user_id)
);
CREATE INDEX page_admins_user_idx ON page_admins(user_id); -- "Pages I admin" lookup — drawer/sidebar widget, identity switcher

CREATE TABLE page_follows (
  page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, user_id)
);
CREATE INDEX page_follows_user_idx ON page_follows(user_id);

CREATE TABLE page_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  label       VARCHAR(80),
  address     TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX page_locations_one_primary ON page_locations(page_id) WHERE is_primary;

CREATE TABLE page_workplace_affiliations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id           UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             VARCHAR(120),
  confirmed_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, user_id)
);

CREATE TABLE page_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  viewer_user_id  UUID REFERENCES users(id), -- nullable: logged-out viewer
  viewed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX page_views_page_time_idx ON page_views(page_id, viewed_at DESC);
-- Model the dedup rule (session/day-scoped, presumably) on whatever the
-- existing profile-view table actually does — NOT verifiable from this
-- workspace; Prompt A's agent must read that table's real migration and
-- copy its exact dedup key, not re-derive one.
```

### 2.2 Actor polymorphism — real blast radius, per current mobile types

The spec calls this "the biggest single risk in Prompt A" and says to audit
every render call site per table rather than grep-and-hope. Here is that
audit, done — for the mobile side of the codebase, which *is* in this
workspace (the equivalent audit against web's components still has to
happen in the web repo):

| Table | Current author shape (verified in `packages/types`) | File |
|---|---|---|
| posts | Flat fields on the row itself: `authorId, authorName, authorAvatar, authorRole, authorSubscriptionTier, authorIsVerified` | `packages/types/src/post.ts` (`FeedPost`), `UserPost` similarly flat |
| events | `organizerId`, `organizerName`, plus a nested `organizer?: EventOrganizerSummary` object on detail responses | `packages/types/src/event.ts` |
| projects | Nested `creator: { ... }` object (added specifically so mobile's Project Detail screen renders an owner-contact panel from one fetch) | `packages/types/src/portfolioProject.ts` |
| communities | No author/owner field on the community row itself — ownership lives in `community_members.role = 'owner'`, a *different* mechanism than the other three | `packages/types/src/community.ts` |

Three different shapes for "who authored this" already exist (flat fields /
nested object / separate membership table) — actor polymorphism doesn't get
to introduce a fourth. The cleanest fit: keep each type's existing
author-rendering shape, but make it able to describe either a user *or* a
page underneath. Concretely, add one shared discriminated field set:

```ts
// packages/types/src/actor.ts — new shared file
export type ActorType = 'user' | 'page';

export interface ActorSummary {
  actorType: ActorType;
  actorId: string;
  name: string;
  avatarUrl: string | null;
  /** Only meaningful when actorType === 'page' — a Page's handle/type line; undefined for a user actor. */
  pageHandle?: string;
  pageType?: PageType;
  isVerified: boolean;
}
```

Then: `FeedPost` gains `actor: ActorSummary` (additive; keep
`authorId`/`authorName`/etc. as deprecated-but-present for one release so
nothing currently reading those fields breaks the instant the backend starts
setting `actor_type`/`actor_id` — this mirrors the migration's own promise
to backfill without dropping `user_id`). `EventOrganizerSummary` becomes a
type alias for (or gets folded into) `ActorSummary`. `PortfolioProject.creator`
does the same. Communities need the actual new capability (a community
*owned* by a Page) modeled as: `community_members` gains a page-owned path,
or — cleaner, given communities already special-cased ownership away from a
flat author field — `communities` gets its own `owner_actor_type` /
`owner_actor_id` pair rather than overloading `community_members`, since a
Page isn't a `users` row and can't hold a `community_members.user_id` FK
without weakening that constraint for every existing (user-owned) community
too. **This is exactly the kind of per-table judgment call the spec asks
Prompt A's agent to make explicitly, not silently** — flagging it here
rather than picking silently.

Every mobile component that currently destructures `authorName`/`authorAvatar`/
`organizer.name`/`creator.displayName` etc. needs a follow-up pass once the
types change — `PostCard.tsx`, `EventCard.tsx`, `EventPostCard.tsx` (added
this week), the Project detail/list cards, `RecentPostsCard.tsx`,
`RecentReviewsCard.tsx`. Not enumerating every line here (that's Prompt A/C's
own PR-description audit, per the spec's instruction) — but flagging that
this repo's own `apps/mobile/components/feed/EventPostCard.tsx` and
`lib/eventPost.ts` (committed 2026-09-25, before Pages existed) are exactly
the kind of file this migration will touch, since anything that renders
"who posted this event into the feed" needs the `actor_type` branch.

### 2.3 Shared SDK layer (`packages/api-client` + `packages/types`)

This repo's `packages/api-client` already has a firm convention (confirmed
across `auth.ts`, `events.ts`, `posts.ts`, `users.ts`): one file per
resource, each exported function's JSDoc states which real backend route it
matches, request/response shapes come from `packages/types`, and the
function itself is a thin `apiGet`/`apiPost`/`apiPatch`/`apiDelete` call —
no bespoke fetch anywhere else. Prompt A's "every new endpoint gets an SDK
method" instruction is just this repo's existing house style — new file
`packages/api-client/src/pages.ts`:

```ts
import { apiGet, apiPost, apiPatch, apiDelete } from './http';
import type {
  Page, PageDetail, PageAdmin, PageAdminRole, PageAnalyticsSummary,
  CreatePagePayload, UpdatePagePayload,
} from '@fashub/types';

/** Matches POST /api/pages exactly. */
export function createPage(payload: CreatePagePayload): Promise<{ page: Page }> {
  return apiPost('/api/pages', payload);
}

/** Matches GET /api/pages/:handle exactly — public + admin fields both present; UI hides what the viewer's role/tier can't do, server already enforced it. */
export function getPage(handle: string): Promise<PageDetail> {
  return apiGet(`/api/pages/${encodeURIComponent(handle)}`);
}

export function updatePage(pageId: string, payload: UpdatePagePayload): Promise<{ page: Page }> {
  return apiPatch(`/api/pages/${pageId}`, payload);
}

export function deactivatePage(pageId: string): Promise<{ message: string }> {
  return apiDelete(`/api/pages/${pageId}`);
}

export function followPage(pageId: string): Promise<{ message: string }> {
  return apiPost(`/api/pages/${pageId}/follow`, {});
}
export function unfollowPage(pageId: string): Promise<{ message: string }> {
  return apiDelete(`/api/pages/${pageId}/follow`);
}

export function getPageAdmins(pageId: string): Promise<{ admins: PageAdmin[] }> {
  return apiGet(`/api/pages/${pageId}/admins`);
}
export function addPageAdmin(pageId: string, userId: string, role: PageAdminRole): Promise<{ admin: PageAdmin }> {
  return apiPost(`/api/pages/${pageId}/admins`, { userId, role });
}
export function updatePageAdminRole(pageId: string, userId: string, role: PageAdminRole): Promise<{ admin: PageAdmin }> {
  return apiPatch(`/api/pages/${pageId}/admins/${userId}`, { role });
}
/** Server rejects (403/409 — confirm exact status with Prompt A) removing the last super_admin row; caller should surface that distinctly from a generic permission error. */
export function removePageAdmin(pageId: string, userId: string): Promise<{ message: string }> {
  return apiDelete(`/api/pages/${pageId}/admins/${userId}`);
}

/**
 * Matches GET /api/pages/:id/analytics/summary. visitorCount/followerCount
 * are present at every tier (feeds the sidebar/drawer widget); trend and
 * competitor fields are undefined below the tier that unlocks them — check
 * their presence, don't gate rendering on a separate tier field the client
 * tracks itself (server is the source of truth per §6 of the spec).
 */
export function getPageAnalyticsSummary(pageId: string): Promise<PageAnalyticsSummary> {
  return apiGet(`/api/pages/${pageId}/analytics/summary`);
}

/** Stubbed server-side this phase per open question §7.4 — flips page.tier without a real charge. Same call shape either way so swapping the backend implementation later needs no client change. */
export function upgradePageTier(pageId: string, tier: 'creator_pro' | 'business_pro'): Promise<{ page: Page }> {
  return apiPost(`/api/pages/${pageId}/tier/upgrade`, { tier });
}
```

`packages/types/src/page.ts` (new file) holds `PageType`, `PageTier`,
`PageAdminRole`, `Page`, `PageDetail`, `PageAdmin`, `PageAnalyticsSummary`,
`CreatePagePayload`, `UpdatePagePayload` — exported from
`packages/types/src/index.ts` next to the existing type groups, same pattern
already used for every other resource in that file.

**Actor picker on the existing composers.** The spec is explicit that Pages
reuses the Post/Event/Project/Community creation flows rather than getting
parallel Page-only forms. Concretely, that means
`createPost`/`createEvent`/`createPortfolioProject`/`createCommunity`'s
payload types each gain an optional `actorId?: string` (omitted = post as
yourself, the current and only behavior today — fully backward compatible).
The mobile composers (`CreatePostModal.tsx`, `CreateEventModal.tsx`,
`ProjectComposerForm.tsx`, and whatever community-creation flow exists) each
need the new actor-picker control wired to that field, sourced from a shared
hook (below) rather than four separate implementations.

### 2.4 Gating helpers

Mirrors the shape the spec asks for — `assertPageRole` / `assertPageTier` as
the two independent, composable checks, each throwing the app's existing
403 shape (not verifiable exactly from this workspace; Prompt A's agent
copies the real shape from the Creator Pro gate function once it's located
in the backend repo):

```ts
// backend — illustrative signature only, actual location TBD (see Prompt A Step 0)
const ROLE_RANK: Record<PageAdminRole, number> = {
  analyst: 0, recruiter: 0, commerce_manager: 0, // no ordering between these three — see note
  content_admin: 1,
  super_admin: 2,
};
const TIER_RANK: Record<PageTier, number> = { standard: 0, creator_pro: 1, business_pro: 2 };

async function assertPageRole(pageId: string, userId: string, minRole: PageAdminRole) { /* ... */ }
async function assertPageTier(pageId: string, minTier: PageTier) { /* ... */ }
```

Note the role axis genuinely isn't a clean total order per §5's matrix —
Commerce Manager, Recruiter and Analyst are siblings (each holds a distinct
capability Content Admin doesn't: Shop/Services, Jobs, and
read-everything-analytics respectively), not points on a single ladder below
Content Admin. `assertPageRole(minRole)` as a single ordinal comparison only
works cleanly for the Super Admin / Content Admin pair; the other three
roles need per-capability checks (`assertPageCapability(pageId, userId,
'manage_shop')` style) rather than a `minRole` threshold. Worth raising with
whoever owns Prompt A before the helper's signature is locked in, since the
spec's own matrix already shows this (no role is a strict superset of
another except Super Admin over everything) — flagged here as a
spec-vs-implementation gap the written matrix doesn't call out explicitly.

---

## 3. Web architecture

**Not verifiable from this workspace** — there is no Next.js app in this
checkout to confirm real file paths against (Prompt B's own Step 0 lists
"locate the Next.js profile page route," which requires that repo open).
What follows is the spec's own routes/component list, kept as-is since I
have no basis to refine it further, plus the two things I *can* say from
this side of the fence:

- The literal-gold/oxblood token gap in §1 applies to web too — its
  `lib/design/tokens.ts` needs the equivalent addition (or confirmation that
  it already carries these values separately from Feed/Messages' violet
  set — the mobile file's own comment implies web's file is where the
  violet-for-Feed/Messages decision originated, so it's plausible web
  already has room for this; can't confirm without reading it).
- The actor-polymorphism audit in §2.2 was done against mobile's types only.
  Prompt B's agent must repeat that same audit against web's actual
  components before touching the migration — the spec already says this,
  restating it here because it's the one place this document can't do the
  work for them.

Routes, components and acceptance criteria: as specified in the original
prompt (§3 of that document) — no changes proposed.

---

## 4. Mobile architecture (concrete — grounded in this repo)

### 4.1 Routes (Expo Router, matching the app's existing `app/` conventions)

```
app/pages/[handle]/index.tsx      → PageProfile (public view)
app/pages/[handle]/manage.tsx     → PageManage (admin dashboard, role-gated)
app/pages/new.tsx                 → PageCreate (creation wizard)
app/pages/index.tsx               → PageDiscovery (search/filter list)
```

Matches the existing `app/profile/[userId].tsx` / `app/community/[slug]/...`
pattern already in the repo — no new routing convention introduced.

### 4.2 Components to reuse (real paths, confirmed in this repo)

| Need | Reuse | Note |
|---|---|---|
| Drawer entry | `components/nav/AppDrawer.tsx` | Already has a `Features` section (`SectionLabel`, line ~387) holding `events`/`communities` entries (lines 36–37) — add a `pages` entry to the same array, same shape |
| Stats strip, tab-nav, post-card | `app/profile/[userId].tsx` and its child components | Spec's own instruction — profile screen already renders a stats strip + tab row + post cards for a personal profile |
| Verified badge (personal) | `components/VerifiedBadge.tsx` | Do **not** reuse directly — violet, brand-locked per its own comment (§1). Build `PagesVerifiedBadge.tsx` as a sibling, gold, same checkmark path as the mock |
| Role pill + role-cycling picker | `app/community/[slug]/settings.tsx`'s `RoleMiniPicker` (line ~730) and the role-permission-description rows (line ~459) | Directly adaptable: same "colored pill for the top role, neutral chip for everything else" visual rule the mock independently uses for Super Admin vs. the rest |
| Follow button, one-way | `components/network/NetworkCard.tsx` | Already conditionally hides a control based on a boolean flag (`profile.allowMessages !== false`, added 2026-09-19) — same pattern extends to hiding/showing Follow vs. Following text |
| Segmented control / tag input | `app/community/[slug]/settings.tsx` | Spec's own instruction; that file already has visibility/posting-permission segmented rows (lines ~435–447) to copy the interaction pattern from |
| Bottom-sheet pattern | Whatever `components/feed/StoryOptionsMenu.tsx` or `components/feed/ComposerChoiceSheet.tsx` uses | Both exist in this repo already (confirmed via earlier `git log` in this session) — the identity switcher's bottom sheet should share whichever sheet primitive those use, not a new one |
| Theme tokens | `packages/design-tokens` — **plus the new `pageColors` export from §1** | No ad hoc hex in Pages screens |

### 4.3 SDK hooks (`packages/api-client` consumers, mobile-side)

Spec asks for `usePage`, `usePageAdmins`, `usePageFollow` modeled on "the
existing `useProfile`-style hook." **Not verifiable**: a hook literally named
`useProfile` was not found in this repo's `apps/mobile` in this session's
exploration — profile data loading in `app/profile/[userId].tsx` may be
inline `useState`/`useEffect` rather than an extracted hook (the same
pattern seen repeatedly across this session's earlier work, e.g.
`professionals.tsx`'s inline fetch-and-state). If that's confirmed true,
Prompt C's agent should treat "usePage" as a **new** hook to introduce
(a genuine improvement — the identity switcher, sidebar widget, and
PageProfile/PageManage screens all need the same Page data, which is exactly
the kind of duplication a shared hook prevents), not a port of an existing
one. Shape:

```ts
// apps/mobile/hooks/usePage.ts (new)
export function usePage(handle: string) {
  const [page, setPage] = useState<PageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // fetch getPage(handle) on mount/handle change — same load/error/loading shape
  // every other screen in this app already uses (AuthContext, professionals.tsx, etc.)
  return { page, loading, error, refetch: /* ... */ };
}

export function usePageAdmins(pageId: string) { /* getPageAdmins, same shape */ }
export function usePageFollow(pageId: string, initialFollowing: boolean) {
  // optimistic toggle mirroring NetworkCard.tsx's onToggleFollow pattern
}
```

### 4.4 Identity switcher (mobile)

Bottom sheet, not a dropdown (spec's own instruction — matches the mobile
platform convention already used elsewhere in this app per §4.2). State:
one value, `activeActorId: string | null` (`null` = posting as yourself),
held in `AuthContext.tsx` alongside the existing `user`/`login`/`logout`
state (that context already centralizes session identity — this is another
facet of the same "who am I right now" concept, not a separate store).
Exposed via `useAuth()` (already the app's one auth hook, confirmed at
`context/AuthContext.tsx:118`) as `activeActor` + `setActiveActor`. Every
composer reads `activeActor` to default its actor picker; switching identity
mid-composition is just changing that value, no different from how
`loginWithGoogle`/`loginWithApple` (added this session) already extend the
same context with new session-shaping actions.

### 4.5 Drawer widget

`AppDrawer.tsx`'s existing profile header/stats strip (exact block not
enumerated here — needs a look at the file's render body, not just its data
array, before writing this) gains one compact row per Page the signed-in
user admins (`page_admins` where `user_id = me`), each showing logo + name +
visitor count + follower count from `getPageAnalyticsSummary`, tapping
through to `/pages/[handle]`. A user with zero admined Pages sees no new
row — satisfies the spec's "no visible change for someone who hasn't
created or been added to one" cross-cutting criterion directly.

### 4.6 Sequencing note specific to this repo

This repo is mid-flight on unrelated mobile work this same week (Google/Apple
SSO, event-cards-in-feed, matching personalization — all committed
2026-09-25/26 per this session's own history). None of that conflicts with
Pages at the type/schema level, but the **actor polymorphism migration
touches the same files** (`FeedPost`, `EventPostCard.tsx`, `PostCard.tsx`)
that `f7aa6cb` ("Add event cards to the feed...") just added/changed.
Whoever picks up Prompt C should rebase onto current `master` first and
expect the actor-field migration to conflict with, not just sit beside,
that recent work.

---

## 5. Consolidated risk register / open questions

Merges the spec's own §7 with what this document's investigation surfaced.
**Items 1–6 are the spec's original flags, unchanged** (this document adds
no opinion on resource naming, who can create a Page, the tier split,
billing hookup, real-time counts, or mobile tab scope — those are product
calls, not architecture ones). **Items 7–9 are new**, surfaced by actually
reading this codebase:

1. *(spec)* Resource naming — `/pages` vs. an in-app label like "Brand"/"House."
2. *(spec)* Who can create a Page — Designer/Tailor only, or wider.
3. *(spec)* Creator Pro vs. Business Pro split — confirm the default reading.
4. *(spec)* Tier billing hookup — stub confirmed fine for phase 1?
5. *(spec)* Visitor/follower counts — on-request DB count vs. real-time pipeline.
6. *(spec)* Mobile tab scope — Home/About/Posts only, or all 8 from the mock.
7. **(new)** Literal gold/oxblood tokens don't exist in the current mobile
   `colors` object (§1) — confirm the `pageColors` addition, or an
   alternative, before any Pages screen is built, since every screen in
   Prompt C depends on the answer.
8. **(new)** `assertPageRole`'s ordinal model breaks down for
   Commerce Manager / Recruiter / Analyst, which are siblings, not rungs on
   a ladder (§2.4) — the gating helper's real signature needs this resolved,
   not just a `minRole` enum comparison, or three of the five roles will be
   checked incorrectly the moment Shop/Jobs/full-analytics ship.
9. **(new)** Community ownership doesn't use a flat author field today (it's
   `community_members.role='owner'`) — unlike posts/events/projects, so
   "a Page can create a Community" needs its own ownership representation
   decision (§2.2's `owner_actor_type`/`owner_actor_id` proposal), not the
   same `actor_type`/`actor_id` pair mechanically applied to a fourth table.

None of items 7–9 block Prompt B (web) from starting — they're mobile- and
data-layer-specific. They do block Prompt C, and item 9 blocks the
`communities` table migration inside Prompt A specifically.

---

## 6. Suggested build order

1. Resolve open questions 1–9 above (product owner + whoever runs Prompt A).
2. Prompt A ships: migrations, actor polymorphism (posts/events/projects
   first — straightforward; communities last, once question 9 is answered),
   gating helpers, SDK methods in the real backend repo's `packages/sdk`.
3. `pageColors` / web token equivalent lands (small, unblocks all UI work;
   can happen in parallel with step 2).
4. Prompt B (web) ships against Prompt A's real endpoints.
5. Prompt C (mobile) ships in the same cycle as B, per the spec's own
   parity rule — rebase onto this repo's current `master` first (§4.6).

---

## Appendix: re-decoding the mock

The source `.html` is a Claude Design canvas export, not plain markup. To
re-extract the real artboard HTML from a fresh copy of that file:

```python
import re, json, gzip, base64

with open('FaSHub Page Profile Mockup.html', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# The compressed bundle is one giant JSON object, one per artboard, each on its own line.
for line in lines:
    line = line.strip()
    if not line.startswith('{"'):
        continue
    obj = json.loads(line)
    for uid, entry in obj.items():
        raw = base64.b64decode(entry['data'])
        html = gzip.decompress(raw).decode('utf-8')
        # `html` now contains a `<script type="__bundler/template">` tag whose
        # text content is itself a JSON string of the REAL artboard HTML:
        tpl = re.search(r'<script type="__bundler/template">(.*?)</script>', html, re.S)
        real_html = json.loads(tpl.group(1))
        print(uid, len(real_html), 'chars — title:', re.search(r'<title>([^<]*)</title>', real_html).group(1))
```
