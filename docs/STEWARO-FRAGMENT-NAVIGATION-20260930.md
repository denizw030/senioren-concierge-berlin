# Same-page navigation and skip links

Live browser QA on the published canonical-source website reproduced a click on “Was STEWARO tut” returning to /de/ with scrollY0 and the services section still4096px below. The root base used by shared pages made #services resolve to /#services, while root routing discarded the fragment. The same base also affects legal-page skip links.

Shared entry routing now pins fragment-only anchors to the current pathname and query. The public root redirect preserves acquisition queries and fragments, matching the existing App root behavior. The three homepage and two shared loaders request entry-routing v2. No layout, pricing, provider or domain changes.

Actual-script VM tests cover DE/EN/TR, a legal page, App route and root public/App routing. Existing SEO and App shell assertions now require preservation of query and fragment. CI and live navigation proof are separate gates.
