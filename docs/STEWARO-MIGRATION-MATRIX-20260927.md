# STEWARO Website Migration Matrix — 2026-09-27

## Status

This matrix implements the current owner decision:

- **STEWARO is the first replacement public website being executed now.**
- The existing production website/customer-account codebase is the technical migration base.
- `stewaro-site/` is frozen as **reference only**. Do not continue building runtime behavior there.
- Existing registration, login, account, Web Concierge, E-Mail, usage, Safety, Voice/phone and Billing capabilities are reused.
- NAHWERK remains only as legacy technical naming during migration; no new public-facing NAHWERK branding is introduced.
- ORFIDEL public website work is paused. Preserve `feature/orfidel-preview-v4-cinematic`.

No production DNS, domain or runtime cutover is authorized by this document.

## Disposition vocabulary

- **reuse 1:1** — preserve implementation/runtime; only route/context checks.
- **rename-brand** — same feature and structure; replace public brand language/assets.
- **visual adaptation** — keep runtime/contracts, redesign presentation for STEWARO.
- **hide/retire for STEWARO** — do not expose on STEWARO unless later explicitly reactivated.
- **legal review** — structure may be reused, but public text must be synchronized with real operator/data flows before cutover.

## Page migration matrix

| Existing authority | STEWARO target | Disposition | Required STEWARO change | Backend/runtime dependency | Gate |
| --- | --- | --- | --- | --- | --- |
| `index.html` | STEWARO Startseite | visual adaptation | Integrate approved STEWARO premium landing direction; STEWARO navigation/brand; keep stable technical entry points | shared website shell / auth entry links | visual + responsive + route regression |
| `404.html` | STEWARO 404 | rename-brand | STEWARO copy/logo, preserve routing behavior | none | static route |
| `anmelden.html` | Anmelden | rename-brand + visual adaptation | STEWARO brand, preserve login/session behavior | Supabase/Auth/session + web-profile adapters | auth regression |
| `registrieren.html` | Registrieren | rename-brand + visual adaptation | STEWARO product context, direct vs sponsor/relative entry, preserve acquisition source | registration/auth/billing/usage/entitlements | registration E2E |
| `konto.html` + `konto/index.html` | Kundenbereich | rename-brand + visual adaptation | STEWARO shell, navigation and copy; preserve all account functions | profile, usage, email, voice, Safety, WhatsApp, billing | critical route parity + account E2E |
| `web-concierge.html` + `web-concierge/index.html` | Concierge | rename-brand + visual adaptation | STEWARO persona/presentation without changing Core authority | auth/session + Concierge Core gateway/history | critical route parity + chat E2E |
| `email-concierge.html` | E-Mail-Verbindung | rename-brand | STEWARO callback/loading presentation only | provider OAuth/session | provider callback regression |
| `safety.html` | Sicherheit | visual adaptation | STEWARO brand and target-group language; preserve Safety semantics | Safety runtime + auth/session | Safety regression |
| `telefonannahme.html` | Telefon / Telefonannahme | visual adaptation | STEWARO presentation; do not imply live availability beyond current gate | Voice/phone + usage/billing | Voice gate remains external |
| `pakete.html` | Preise / Pakete | visual adaptation | STEWARO pricing and copy only after pricing authority is confirmed | billing/usage/entitlements | pricing-authority regression |
| `payg.html` | PAYG / Zusatznutzung | rename-brand or account-only | Keep only if STEWARO pricing model uses PAYG; no invented prices | billing/usage | pricing decision |
| `angehoerige.html` | Für Angehörige | visual adaptation | Make sponsor/relative journey a primary STEWARO path | family/sponsor relationship + Safety | sponsor-flow E2E |
| `zugang-uebertragen.html` | Zugang übertragen | rename-brand + visual adaptation | STEWARO beneficiary/sponsor wording | auth + account transfer + family context | transfer E2E |
| `ablauf.html` | So funktioniert STEWARO | visual adaptation | Reuse structure, replace NAHWERK language with approved STEWARO flow | links into registration/concierge | route regression |
| `leistungen.html` | Leistungen | visual adaptation | Reuse capability truth, apply STEWARO editorial design | shared capabilities | content/runtime consistency |
| `erster-schritt.html` | Erste Aufgabe | rename-brand + visual adaptation | STEWARO onboarding copy | auth/session + Concierge | onboarding E2E |
| `concierge-anpassen.html` | Concierge anpassen | rename-brand + visual adaptation | STEWARO persona/voice presentation; preserve secure profile adapters | profile/persona/voice | profile regression |
| `faq.html` | FAQ | visual adaptation | STEWARO questions, pricing/legal/product truth synchronized | links only | static/content QA |
| `kontakt.html` | Kontakt | rename-brand + visual adaptation | STEWARO contact presentation | contact channels | channel truth check |
| `impressum.html` | Impressum | legal review | STEWARO/ORFIDEL operator identity exactly synchronized | legal/operator data | legal approval |
| `datenschutz.html` | Datenschutz | legal review | STEWARO domain/data-flow wording; preserve any redirect mechanics only if still required | auth/data providers | legal + route QA |
| `agb.html` | Nutzungsbedingungen/AGB | legal review | STEWARO contractual brand/operator/pricing terms | billing/voice/Safety/WhatsApp | legal approval |
| `datenloeschung.html` | Datenlöschung | legal review | STEWARO branding and exact deletion process | account/data providers | legal + deletion E2E |
| `widerruf.html` | Widerruf | legal review | STEWARO operator/contract wording | billing/contract state | legal approval |
| `vertrag-widerrufen.html` | Vertrag widerrufen | legal review | STEWARO brand and submission path | auth/contract process | submission E2E |
| `senioren-concierge.html` | likely fold into STEWARO core story | hide/retire for STEWARO after SEO review | STEWARO itself is the older-adult concierge; avoid duplicate stigmatizing route | shared content only | SEO/redirect decision |
| `prime-concierge.html` | Personal Concierge / product detail | visual adaptation or hide | Keep only if it maps to current STEWARO product packaging | billing/usage/voice/Safety | product/pricing decision |
| `concierges.html` | international availability | hide/retire for STEWARO initially | Do not carry “NAHWERK weltweit” into launch without current scope proof | voice/WhatsApp | later international gate |
| `app-live.html` | app/live helper | reuse 1:1 internally, rename if exposed | Do not make launch-critical unless app gate is active | auth/app | app remains paused |
| `alltag-organisieren.html` | Alltag organisieren | visual adaptation | STEWARO SEO/editorial content | links only | content QA |
| `dokumente-verstehen.html` | Dokumente verstehen | visual adaptation | STEWARO SEO/editorial content; preserve capability truth | Concierge capabilities | content QA |
| `technik-verstehen.html` | Technik verstehen | visual adaptation | STEWARO SEO/editorial content | Concierge capabilities | content QA |
| `ueber-mich.html` | Über STEWARO / Über uns | hide/retire or rewrite | Existing personal/legacy framing must not be blindly rebranded | none | owner content decision |
| `voice-audition.html` | none public | hide/retire for STEWARO | Internal/test surface only unless explicitly promoted | voice | not launch route |
| `produktluecken.html` | none public | hide/retire for STEWARO | Internal diagnostic/product-gap surface | none | not public |
| clean-route mirrors | same STEWARO route | reuse 1:1 | Keep byte/parity rules intact when parent page changes | same as parent | parity tests mandatory |
| `CNAME` / production domain config | later STEWARO cutover | reuse only at cutover | **Do not change now** | DNS/mail/domain | separate explicit cutover |

## Shared components to reuse rather than rebuild

1. Authentication/session flows
2. Registration and onboarding contracts
3. Customer account shell and profile adapters
4. Web Concierge and canonical conversation history
5. E-Mail connection/provider flows
6. Usage/entitlement/billing presentation
7. Safety configuration
8. Voice/phone surfaces
9. Family/sponsor/access-transfer flows
10. Legal/deletion routes and their backend processes
11. Existing clean-route parity and regression infrastructure

## Frozen standalone prototype

`stewaro-site/` remains in the repository because it contains recoverable STEWARO copy, page ideas and early brand structure.

Rules:
- no deletion;
- no further runtime expansion;
- no new production dependency may point to it;
- do not merge the pending standalone-only storage/session change merely to advance this prototype;
- extract useful presentation/copy into the shared technical base only through scoped STEWARO migration work.

## Protected parallel work

Do not modify, rebase, merge or replace files from:

- `feature/orfidel-preview-v4-cinematic`

unless the ORFIDEL workstream is explicitly reactivated.

## Implementation order

1. Freeze standalone prototype and lock architecture.
2. Establish STEWARO brand shell/tokens on the existing website foundation.
3. Integrate the approved STEWARO landing experience into the shared base.
4. Convert auth + registration.
5. Convert customer account shell and critical clean-route mirrors.
6. Convert Web Concierge, E-Mail, Safety and phone presentation without forking backend engines.
7. Convert pricing/usage only against current billing authority.
8. Convert sponsor/relative flows.
9. Synchronize legal pages to actual STEWARO/ORFIDEL production data flows.
10. Run responsive, route-parity, auth, account, chat, mail, Safety, billing and sponsor E2E.
11. Only then prepare STEWARO production domain/DNS cutover.
12. After observation, retire legacy public NAHWERK routes/branding according to an explicit cutover plan.

## Block 2 implementation status — 2026-09-27

- Shared-base STEWARO brand shell is implemented on isolated Draft PR #265.
- The approved premium STEWARO homepage has been integrated into the existing website technical base.
- Existing login, registration, account, Web Concierge, E-Mail callback, Safety, pricing/PAYG, phone, relatives, services, flow, FAQ, contact and concierge-settings surfaces remain on the existing runtime/contracts and receive the STEWARO presentation layer.
- Clean-route mirrors changed by this block remain paired.
- Dedicated `STEWARO Shared Base CI` is GREEN and verifies: frozen/protected path isolation, unchanged production CNAME, STEWARO contract, critical route parity and auth security.
- `nahwerkconcierge.com`, website `main`, CNAME/DNS and Production traffic remain unchanged.
- Broad legacy regression workflows still contain assertions for the old NAHWERK homepage/story/assets and therefore fail on this intentional replacement candidate. These checks have **not** been weakened or bypassed. PR #265 remains Draft and must not merge until migration-aware replacement coverage or equivalent acceptance closes this gate.

## Current gate

**Documentation/inventory gate: complete when this matrix and the central canonical authority are merged.**

Next implementation gate: **STEWARO brand shell on the existing website foundation**, with no production cutover.


## Residual public-surface cleanup · 2026-09-28

- Clear launch-facing legacy brand copy migrated to STEWARO on:
  - `404.html`
  - `zugang-uebertragen.html`
  - `erster-schritt.html`
  - `passwort-zuruecksetzen.html`
  - `vertrag-widerrufen.html`
  - `alltag-organisieren.html`
  - `dokumente-verstehen.html`
  - `technik-verstehen.html`
  - `prime-concierge.html`
  - corresponding clean-route mirrors where present
- Public-facing `Kundenbereich` wording in the touched transfer/first-value surfaces is normalized to `Klientenbereich`.
- First-value/document/Concierge channel copy is fail-closed and no longer presents WhatsApp as universally active before that channel is enabled for the relevant access.
- `prime-concierge` now follows the canonical STEWARO persona decision: FIDEL is the fixed concierge and legacy persona-selection carousels are replaced by the static FIDEL presentation.
- Clean-route parity regression coverage now includes the newly migrated route pairs.
- Residual public-brand regression coverage prevents these routes from reintroducing visible NAHWERK copy while legacy technical identifiers and the current production canonical host remain untouched.
- Intentionally unresolved routes remain unchanged pending their explicit gate:
  - `senioren-concierge`: SEO/redirect decision required before fold/retirement.
  - `concierges`: later international-scope gate.
  - `ueber-mich`: owner content decision required.
- PR #266 remains a telephone child branch of PR #265; this website cleanup intentionally avoids telephone implementation files.
- No Production merge, CNAME/DNS change or runtime-authority change.


## Owner website decisions · 2026-09-28

- Brand model reaffirmed: **STEWARO is the public brand; FIDEL is the STEWARO KI-Concierge.**
- `senioren-concierge` is retained as a STEWARO-targeted page/legacy SEO route. The route/file name is technical and does not define a separate brand or concierge. Public copy is migrated to STEWARO + FIDEL and legacy NAHWERK/persona framing is removed.
- `concierges` / “STEWARO weltweit” is **not part of the initial launch**. German, English and Turkish route files are removed from the launch branch, sitemap entries are removed, and residual links are suppressed by the STEWARO shared stylesheet. International scope may be reintroduced only by a later explicit decision.
- `ueber-mich` is retained as the technical route but rebuilt publicly as **Über STEWARO**, explaining STEWARO as the brand and FIDEL as the fixed KI-Concierge.
- No Production merge, CNAME/DNS change or runtime-authority change is authorized by these content decisions.


## Datenschutz legal-hub redesign · 2026-09-28

- STEWARO Datenschutz was redesigned as a clean European legal-document hub inspired by modern EU privacy UX patterns:
  - large plain-language privacy heading and introduction;
  - persistent legal-document navigation for Datenschutz, Nutzungsbedingungen, KI-Transparenz, Datenlöschung, Impressum and Widerruf;
  - clear DSGVO summary card;
  - readable long-form legal typography and mobile layout.
- The existing substantive privacy sections remain the legal base and were not replaced with competitor copy.
- STEWARO deliberately does **not** claim that all data stays exclusively in the EU. The public privacy page continues to disclose possible EEA-external processing and the corresponding DSGVO transfer mechanisms.
- Migration-aware disclosures now cover AWS/n8n transition paths, OpenAI, Meta/WhatsApp, Supabase, relevant e-mail/payment/telephony provider classes and gated telephone processing.
- The privacy page states STEWARO as the brand and FIDEL as the KI-Concierge.
- Dedicated regression coverage prevents future introduction of absolute “100% EU only” claims unless separately proven and approved.
- Production main, CNAME and DNS remain unchanged.
