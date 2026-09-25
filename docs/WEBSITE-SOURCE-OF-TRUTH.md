# Customer Website Source of Truth

> Legacy repository/public brand note (2026-09-25): this repository currently serves the NAHWERK production website, but NAHWERK is no longer the target public brand. The target consumer brands are ORFIDEL and STEWARO, with MyParentGuard as the STEWARO relative/sponsor acquisition surface. ODYSX remains a separate corporate/holding website. See `docs/BRAND-AND-DEPLOYMENT-ARCHITECTURE.md`.

## Canonical systems

| Area | Authority | Production path |
| --- | --- | --- |
| Current public website + customer account UI | `denizw030/senioren-concierge-berlin` | `main` -> GitHub Pages -> `nahwerkconcierge.com` until explicit ORFIDEL cutover |
| Concierge backend / workers / Supabase functions | `denizw030/nahwerk-platform` | platform-specific PROD pipelines |
| Website staging integration | `staging/website-canonical` | no direct production authority |
| Brand-migration recovery baseline | `snapshot/20260925-pre-orfidel-migration` | immutable recovery branch |
| Earlier recovery baseline | `snapshot/20260924-pre-hygiene` | immutable recovery branch |

## Brand transition guard

- Do not add new public-facing NAHWERK brand work.
- Do not fold ODYSX corporate pages/assets into the consumer website.
- ORFIDEL is the first replacement public experience and uses Fidel as its concierge identity.
- STEWARO is a separate consumer brand experience for older users.
- MyParentGuard is a STEWARO acquisition/onboarding surface for relatives, not a fourth concierge engine.
- Existing account, Web Concierge, billing and runtime surfaces stay functional while the public brand layer is migrated.
- Existing `nahwerk` technical identifiers are legacy and may remain temporarily; do not mass-rename them as part of visual work.

## What caused the September 24 confusion

The personal customer cockpit was added to both account entry files, then intentionally removed later by the commit family titled `fix(account): restore stable overview after cockpit load regression`. The subsequent Web Concierge/sidebar changes did not delete the cockpit. Because production publishes every accepted `main` state, the timing made it look like later Web Chat work overwrote the overview.

## Route model

The site keeps both legacy `.html` entry files and clean-route directory entries. Critical pairs must be byte-equivalent after removing the clean-route base tag.

Current critical pairs:
- `konto.html` and `konto/index.html`
- `web-concierge.html` and `web-concierge/index.html`

These are not separate product versions. They are two route entry files for the same customer surface.

## Release discipline

- `main` = only current production authority.
- Fresh branch from latest `main` for every task.
- Larger website work lands in `staging/website-canonical` first.
- PR checks must pass before merging to production.
- No task may restore an old whole-page snapshot over newer `main`.
- Recovery uses `snapshot/*`, not ad-hoc copying from historical branches.
- ORFIDEL public-site work must be isolated from account/runtime behavior and verified in staging before domain cutover.

## Cleanup policy

Historical branches are not automatically harmful; they become dangerous when reused or treated as current. Cleanup therefore follows this order:
1. Freeze production snapshot.
2. Stop reuse of old branches.
3. Close only PRs proven superseded/merged.
4. Delete only branches proven fully merged or otherwise preserved.
5. Keep recovery snapshots immutable.

This preserves all unique work while removing ambiguity about what is live.
