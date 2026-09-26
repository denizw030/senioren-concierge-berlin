# Customer Website Repository Contract

This repository is the canonical customer-facing website and account UI for the current production website surfaces. It is the technical foundation for ORFIDEL and STEWARO website work.

## Canonical platform authority — mandatory
- **Before planning or executing any brand, domain, navigation, website, routing, deployment, integration or migration task, read the cross-platform canonical authority:** `denizw030/nahwerk-platform/docs/PLATFORM-SOURCE-OF-TRUTH.md`.
- Also read the relevant machine-readable platform authority under `denizw030/nahwerk-platform/config/`.
- This repository must follow that central authority and must not create a second competing source of truth.
- Local website implementation detail may live here, but cross-platform decisions remain authoritative in `nahwerk-platform/docs/PLATFORM-SOURCE-OF-TRUTH.md`.
- At task start, inspect current `main`, active branches/PRs and the files/surfaces you may touch for collisions.
- If website work changes a canonical cross-platform decision, runtime authority, migration gate, blocker or production cutover state, create/update the corresponding canonical source-of-truth change in `denizw030/nahwerk-platform` before final handoff, or return an explicit canonical delta to the MASTER for immediate integration.
- Every substantial handoff must state: changed / verified / still open / blocked or manual gate / canonical delta / next gate.
- Never allow stale chat history, old website branches or legacy naming to override the central canonical source of truth.

## Local website architecture
- Before brand/domain/navigation work, also read `docs/BRAND-AND-DEPLOYMENT-ARCHITECTURE.md` for repository-specific implementation details.
- Repository-local documentation may elaborate on implementation but may not contradict the cross-platform source of truth.

## Brand architecture guard
- ORFIDEL is the operating/company umbrella for ORFIDEL.com and STEWARO.com. ORFIDEL.com is also a modern public concierge experience for older people who discover it themselves and for relatives.
- STEWARO is its own concierge brand/site within the ORFIDEL company structure.
- MyParentGuard, GuardMyParents and ParentGuard24 belong to STEWARO as relative/sponsor acquisition surfaces. They are not separate concierge runtimes.
- MyParentGuard.com redirects to STEWARO.com while acquisition attribution is preserved.
- ODYSX is a separate corporate/holding website unless a newer canonical owner decision explicitly supersedes that role. Never merge ODYSX public pages, assets, navigation or brand styling into ORFIDEL/STEWARO surfaces.
- NAHWERK is legacy naming. Do not introduce new public-facing NAHWERK branding.
- Do not mass-rename internal legacy identifiers while doing visual/brand work.

## ORFIDEL / STEWARO separation
- ORFIDEL and STEWARO are separate public website experiences even when they share reusable code/components.
- Protected ORFIDEL work must not be overwritten by STEWARO tasks.
- Known protected ORFIDEL branch: `feature/orfidel-preview-v4-cinematic`.
- STEWARO work should stay inside clearly scoped STEWARO files/surfaces whenever possible.

## Production authority
- `main` is current production website authority.
- Never make task work directly on `main`.
- Start every standalone task from the current `main` SHA on a new task-specific branch.
- One task = one branch. Never reuse an old feature/fix branch for unrelated work.
- Preview or temporary deployments must never become production authority.
- `snapshot/20260925-pre-orfidel-migration` is the brand-migration recovery baseline and is immutable.

## Safe change flow
1. Read the cross-platform canonical source of truth.
2. Read current website `main` immediately before editing.
3. Inspect open PRs/active branches for collisions.
4. Create/use the task-specific branch.
5. Change only files required for the task.
6. Run the relevant regression tests.
7. For larger UI changes, integrate through `staging/website-canonical` before `main` when that integration line is active for the task.
8. Update/hand off the cross-platform canonical delta if canonical state changed.
9. Merge only after the relevant checks are green.
10. Never remove an existing customer surface merely to hide a runtime/load bug. Fix or disable the failing runtime while preserving the last stable UI.

## Critical mirrored routes
The repository intentionally contains clean-route mirrors.
- `konto.html` <-> `konto/index.html`
- `web-concierge.html` <-> `web-concierge/index.html`

For these pairs, both files must remain equivalent except for the clean-route `<base href="/">` insertion. Any task touching one must update and test the other in the same branch.

## Collision prevention
- Before every mutation and before merging, compare against the latest authority and preserve unrelated newer changes.
- Do not replace whole pages when a scoped asset or component change is sufficient.
- Do not copy an older page snapshot over current `main`.
- Do not deploy from stale branches.
- Do not mix account overview, Web Concierge, email UI, registration, global theme, ORFIDEL and STEWARO work unless the task genuinely spans them and collision analysis is complete.
- Cache-bust changes must stay scoped to the asset actually changed.
- ORFIDEL and STEWARO must remain distinct public brand experiences even when they share code/components. MyParentGuard, GuardMyParents and ParentGuard24 are STEWARO acquisition surfaces, not additional concierge runtimes.

## Preservation
- Branches named `snapshot/*` are recovery points and must not be modified.
- Do not delete branches or close PRs solely because they are old. First prove the work is merged, superseded or preserved elsewhere.
- Do not delete currently unused assets if they contain recoverable product work unless explicitly approved after comparison.

## Required checks for account/Web Concierge work
At minimum run:
- `node --test tests/konto-clean-route-parity.test.mjs`
- `node --test tests/critical-route-parity.test.mjs`
- the feature-specific test(s) for the changed surface

If an existing check fails for an unrelated known reason, do not mask, delete or weaken the check. Report the failure and keep the change isolated.
