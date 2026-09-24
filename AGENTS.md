# NAHWERK Website Repository Contract

This repository is the canonical customer-facing website and account UI for nahwerkconcierge.com.

## Production authority
- `main` is production and is published by GitHub Pages.
- Never make task work directly on `main`.
- Start every task from the current `main` SHA on a new task-specific branch.
- One task = one branch. Never reuse an old feature/fix branch for unrelated work.
- Preview or temporary deployments must never become the production authority.

## Safe change flow
1. Read current `main` immediately before editing.
2. Create a fresh branch from current `main`.
3. Change only files required for the task.
4. Run the relevant regression tests.
5. Open a PR. Merge only after the relevant checks are green.
6. For larger UI changes, integrate through `staging/website-canonical` before `main`.
7. Never remove an existing customer surface merely to hide a runtime/load bug. Fix or disable the failing runtime while preserving the last stable UI.

## Critical mirrored routes
The repository intentionally contains clean-route mirrors.
- `konto.html` <-> `konto/index.html`
- `web-concierge.html` <-> `web-concierge/index.html`

For these pairs, both files must remain equivalent except for the clean-route `<base href="/">` insertion. Any task touching one must update and test the other in the same branch.

## Collision prevention
- Before merging, compare the branch against the latest `main`; do not overwrite unrelated newer changes.
- Do not replace whole pages when a scoped asset or component change is sufficient.
- Do not copy an older page snapshot over current `main`.
- Do not deploy from stale branches.
- Do not mix account overview, Web Concierge, email UI, registration, and global theme work in one branch unless the task genuinely spans them.
- Cache-bust changes must stay scoped to the asset actually changed.

## Preservation
- Branches named `snapshot/*` are recovery points and must not be modified.
- Do not delete branches or close PRs solely because they are old. First prove the work is merged, superseded, or preserved elsewhere.
- Do not delete currently unused assets if they contain recoverable product work unless explicitly approved after comparison.

## Required checks for account/Web Concierge work
At minimum run:
- `node --test tests/konto-clean-route-parity.test.mjs`
- `node --test tests/critical-route-parity.test.mjs`
- the feature-specific test(s) for the changed surface

If an existing check fails for an unrelated known reason, do not mask, delete, or weaken the check. Report the failure and keep the change isolated.
