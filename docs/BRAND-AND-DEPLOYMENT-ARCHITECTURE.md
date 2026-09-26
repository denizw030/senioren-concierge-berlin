# Brand and Deployment Architecture — 2026-09-25

## Status

This document is the canonical transition map for the move away from the public NAHWERK brand.

No production runtime is renamed or deleted by this document. Existing production stays live until each replacement surface is tested and explicitly cut over.

## Target company and brand model

```text
ORFIDEL
= operating company / umbrella structure
│
├── ORFIDEL.com
│   └── modern public concierge experience for
│       older people who discover it themselves
│       and for relatives
│
└── STEWARO.com
    └── independent concierge brand/site
        within the ORFIDEL company structure
        │
        ├── MyParentGuard
        ├── GuardMyParents
        └── ParentGuard24
            = relative/sponsor acquisition surfaces
              that resolve into STEWARO

ODYSX
= separate holding/corporate identity unless a newer canonical owner decision supersedes that role
```

### Rules

- ORFIDEL is the operating/company umbrella for ORFIDEL.com and STEWARO.com.
- ORFIDEL.com is also a public concierge experience aimed at older people who discover the service themselves and at relatives.
- STEWARO is a distinct concierge brand/site within the ORFIDEL company structure.
- MyParentGuard, GuardMyParents and ParentGuard24 belong to STEWARO and are not separate concierge runtimes.
- MyParentGuard.com redirects to STEWARO.com while preserving acquisition attribution.
- STEWARO must remain attractive, modern and non-stigmatizing; its public presentation must not frame the user as old, frail or in need of "senior software".
- ODYSX remains separate unless a newer canonical owner decision explicitly supersedes that role.
- NAHWERK is a legacy public/internal name and must not be introduced into new public brand work.

## Current production authorities

| Area | Current authority | Transition role |
| --- | --- | --- |
| Public website + customer account UI | `denizw030/senioren-concierge-berlin/main` -> GitHub Pages -> `nahwerkconcierge.com` | Legacy production until ORFIDEL cutover |
| Backend/core/workers/Supabase | `denizw030/nahwerk-platform/main` | Becomes shared, brand-neutral Concierge Platform |
| ODYSX website | Vercel project `odysx-holding` | Keep separate; no consumer-brand code |
| ODYSX drop/reference | Vercel project `odysx-v9.5-vercel-drop` | ODYSX-only reference/deployment |
| Website staging | `staging/website-canonical` | Integration only |
| Platform staging | `staging/platform-canonical` | Integration only |

## Vercel organization

The current Vercel team is still named `NAHWERK Concierge`. This is legacy organization naming only. It must not be treated as the future brand hierarchy.

Current projects observed there include:
- `odysx-holding`
- `odysx-v9.5-vercel-drop`
- `nahwerk-central-orchestrator-prod`
- `nahwerk-central-orchestrator-staging`
- legacy/temporary NAHWERK preview and diagnostic projects

Do not delete or bulk-rename these projects during the brand migration. Rename/move only after dependency and deployment ownership are proven.

## Website target model

The existing website code remains the starting technical asset. It is not discarded.

Target surfaces:

| Domain | Public role | Shared runtime |
| --- | --- | --- |
| `orfidel.com` | ORFIDEL public company/concierge website for self-discovering older users and relatives | Shared Concierge Platform |
| `orfidel.de` | German ORFIDEL entry/redirect as decided at cutover | Shared Concierge Platform |
| `stewaro.com` | STEWARO concierge website within ORFIDEL | Shared Concierge Platform |
| `stewaro.de` | German STEWARO entry/redirect | Shared Concierge Platform |
| `myparentguard.com` | Relative/sponsor acquisition entry belonging to STEWARO | Redirect/entry into STEWARO |
| `myparentguard.de` | German MyParentGuard acquisition entry | Redirect/entry into STEWARO |
| `parentguard24.*`, `guardmyparents.*` | STEWARO relative/sponsor acquisition surfaces | Route into STEWARO with source attribution preserved |
| legacy NAHWERK/NAHWORK domains | transition only | Redirect/retire later after explicit decision |

## ORFIDEL website direction

ORFIDEL is the first new public surface.

Design intent:
- deep black premium base
- white ORFIDEL wordmark
- crown as brand symbol
- restrained cool-white/ice-blue lighting
- large typography and generous negative space
- cinematic scroll choreography and a subtly living background
- Fidel represented as a premium digital presence/surface, not a robot
- product story shows request -> understand -> act -> follow up -> done
- existing login, account, billing, chat and runtime capabilities are reused rather than rebuilt

The current public landing page may be replaced by ORFIDEL only after a recovery baseline, staging verification and explicit domain cutover.

## STEWARO / MyParentGuard model

STEWARO reuses the technical website/platform components but gets an independent brand experience.

MyParentGuard / GuardMyParents / ParentGuard24:
- address the relative/sponsor
- belong to STEWARO
- preserve acquisition source internally
- create or sponsor a STEWARO relationship for the beneficiary
- must not create duplicate concierge engines
- hand the beneficiary into STEWARO branding

## Shared platform target

The backend becomes brand-neutral. New shared contracts should use neutral terminology such as:
- `brand_id`
- `persona_id`
- `tenant_id`
- `source_channel`
- `sponsor_role` / beneficiary relationship where needed

Expected brand contexts:

```text
ORFIDEL:
brand_id = orfidel
persona_id = fidel

STEWARO direct:
brand_id = stewaro

MyParentGuard acquisition:
brand_id = stewaro
acquisition_source = myparentguard
actor_role = sponsor
beneficiary_brand = stewaro
```

Internal functions and repository paths that currently contain `nahwerk` are legacy technical identifiers. Do not mass-rename them. Migrate incrementally with regression coverage.

## Separation guards

1. ODYSX corporate website and assets never become part of ORFIDEL/STEWARO/MyParentGuard public pages.
2. ORFIDEL design work must not overwrite customer-account, Web Concierge, billing or runtime behavior.
3. STEWARO must be a separate brand experience, not a visual clone of ORFIDEL.
4. MyParentGuard, GuardMyParents and ParentGuard24 must route into STEWARO product semantics rather than creating additional runtimes.
5. No new public-facing NAHWERK branding is added.
6. Existing legacy identifiers remain until their replacement is tested.
7. Every broad migration gets a fresh branch, staging verification and recovery snapshot before production.

## Recovery baselines

Brand migration baseline created before ORFIDEL work:
- website: `snapshot/20260925-pre-orfidel-migration`
- platform: `snapshot/20260925-pre-orfidel-migration`

These branches are immutable recovery points.

## Execution order

1. Freeze and document current architecture.
2. Introduce neutral brand context without changing existing behavior.
3. Build ORFIDEL public experience on the existing website foundation in staging.
4. Wire ORFIDEL to the shared existing runtime.
5. Verify account, billing, Web Concierge, email, voice and task continuity.
6. Cut over `orfidel.com` only after acceptance.
7. Build STEWARO as a separate brand surface using shared components.
8. Build MyParentGuard, GuardMyParents and ParentGuard24 as sponsor/acquisition flows into STEWARO.
9. Retire public NAHWERK branding only after all replacement routes are proven.
