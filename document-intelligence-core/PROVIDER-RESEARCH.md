# Document OCR / Vision provider research (2026-08-26)

This branch is extraction-only. Document Intelligence remains the business interpretation layer. No live customer documents, credentials, n8n, Supabase production migrations, Prime, or production integration are used.

## Selection

- OpenAI Vision: preferred for small photos/screenshots when semantic visual reading is useful. Image and file inputs are available through the Responses API. OpenAI API data is not used for training by default. Default abuse-monitoring retention can be up to 30 days; eligible approved customers can configure Zero Data Retention. ZDR and regional processing require account/project eligibility. This adapter therefore advertises ZDR/EU only as configurable capabilities, never as unconditional runtime guarantees.
- Google Document AI: preferred default for OCR/layout-heavy PDFs, invoices/forms and multi-page documents. Enterprise Document OCR supports printed/handwritten OCR and German; Document AI supports EU multi-region. Current documented system limits include 40 MB online and 1 GB batch; Enterprise OCR is 15 pages synchronous (30 imageless) and 500 batch. Public OCR pricing starts with a free allowance then page-based pricing.
- Azure AI Document Intelligence: strong PDF/image, Read/Layout/prebuilt/custom document path. Current v4 limits document PDF/image support, up to 2,000 analysis pages on S0, 500 MB S0 / 4 MB F0 and default 15 analyze TPS on S0. Runtime region/retention must be verified from the configured Azure resource; the core does not claim ZDR.
- AWS Textract: suitable structured OCR boundary for text/forms/tables and asynchronous multi-page workflows. The adapter remains configuration-gated; pricing and region are runtime/deployment concerns and are deliberately not hard-coded.
- Mistral OCR: researched as an additional candidate but not added to the minimum adapter set in this isolated block. No capability is marked true in code without a maintained adapter boundary.

## Capability policy

Capabilities are conservative. `true` means the provider family has documented support suitable for routing; deployment-dependent guarantees such as region and retention still have to pass `DocumentProcessingPolicy`. Unsupported or unconfigured live calls fail closed with `MissingProviderConfiguration` / `ProviderUnavailable`.

## Cost control

The planner checks page count before provider selection, selects one provider deterministically and never fans out to multiple providers by default. Only Google Enterprise OCR has a static illustrative public per-page estimate in this core; other provider costs return `RUNTIME_PRICING_REQUIRED` rather than stale invented numbers.

## Privacy

`RESTRICTED` defaults to external processing disabled. Raw document/image/content fields are excluded from provider metadata and audit output. Fixtures are synthetic. Provider fallback is disabled for restricted processing unless policy is deliberately changed, and no raw document is logged.

## External prerequisites for live use

Provider account, API credential, approved region/data-retention configuration, current pricing/quota validation, transport implementation and a production security/privacy review. None are enabled by this branch.
