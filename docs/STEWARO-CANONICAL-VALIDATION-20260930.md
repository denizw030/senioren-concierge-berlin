# STEWARO canonical page validation

The current reviewed STEWARO DE/EN/TR pages supersede the legacy NAHWERK seed generators. Three postmerge workflows tried to regenerate this already-authored content: overview-lifestyle failed on the removed root stylesheet anchor, i18n-runtime-hardening on old acquisition copy, and localization-bootstrap on the removed legacy concierges.html page.

The workflows now validate the canonical files on pull requests and main. Every previous media, SEO, design-parity, link-flow and language-completeness assertion remains; public-terminology and workflow permission checks are added. They have read-only repository permission and cannot bypass branch review by committing directly to main. Legacy scripts remain preserved as migration history, not automatic production writers.

This correction changes no customer pages, engines, runtime authority, ORFIDEL branch, DNS, provider settings or payment behavior. CI and Pages deployment must be proven separately. The unchanged media checks require the complete repository binary assets; a text-only local source checkout cannot prove them.
