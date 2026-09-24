# NAHWERK Website Source of Truth

## Canonical systems

| Area | Authority | Production path |
| --- | --- | --- |
| Public website + customer account UI | `denizw030/senioren-concierge-berlin` | `main` -> GitHub Pages -> `nahwerkconcierge.com` |
| Concierge backend / workers / Supabase functions | `denizw030/nahwerk-platform` | platform-specific PROD pipelines |
| Website staging integration | `staging/website-canonical` | no direct production authority |
| Recovery baseline | `snapshot/20260924-pre-hygiene` | immutable recovery branch |

## What caused the September 24 confusion

The personal customer cockpit was added to both account entry files, then intentionally removed later by the commit family titled `fix(account): restore stable overview after cockpit load regression`. The subsequent Web Concierge/sidebar changes did not delete the cockpit. Because production publishes every accepted `main` state, the timing made it look like later Web Chat work overwrote the overview.

## Route model

The site keeps both legacy `.html` entry files and clean-route directory entries. Critical pairs must be byte-equivalent after removing the clean-route base tag.

Current critical pairs:
- `konto.html` and `konto/index.html`
- `web-concierge.html` and `web-concierge/index.html`

These are not separate product versions. They are two route entry files for the same customer surface.

## Release discipline

- `main` = only production authority.
- Fresh branch from latest `main` for every task.
- Larger website work lands in `staging/website-canonical` first.
- PR checks must pass before merging to production.
- No task may restore an old whole-page snapshot over newer `main`.
- Recovery uses `snapshot/*`, not ad-hoc copying from historical branches.

## Cleanup policy

Historical branches are not automatically harmful; they become dangerous when reused or treated as current. Cleanup therefore follows this order:
1. Freeze production snapshot.
2. Stop reuse of old branches.
3. Close only PRs proven superseded/merged.
4. Delete only branches proven fully merged or otherwise preserved.
5. Keep recovery snapshots immutable.

This preserves all unique work while removing ambiguity about what is live.
