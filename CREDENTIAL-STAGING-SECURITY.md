# NAHWERK Credential / Staging Security

## Boundary
This package is metadata/policy only. It creates, reads and stores no live secrets and performs no provider, n8n, Supabase or production mutation.

## Secret-store strategy
- n8n credentials: platform-wide workflow credentials only where n8n is the execution boundary (e.g. Twilio/OpenAI/server API credentials). Never use one shared n8n credential for customer Gmail/Microsoft/IMAP tokens.
- Supabase/Edge secrets: server-side webhook forwarding, signing and service credentials, plus opaque encryption-key references. Never expose existing values.
- Provider-native stores: prefer provider-native OAuth/IAM lifecycle controls where they provide stronger revocation/temporary credentials.
- Customer credentials: encrypted, write-only ingestion; return opaque references only. Key management must be separate from ciphertext. No custom cryptography without review.

## OAuth
Authorization request -> consent -> callback -> server-side exchange -> encrypted storage -> opaque references -> refresh -> revoke. Validate state, PKCE and redirect URI where supported. Client storage is never source of truth. Begin with least privilege: Microsoft `Mail.Read`, Gmail read-only, and only required Calendly scopes.

## IMAP/app passwords
GMX, WEB.DE and T-Online credentials are never Memory, chat, audit, execution output, logs, or plaintext database fields. UI is write-only and the value is not returned after storage.

## Provider notes
- Twilio: Account SID is an identifier; token/API key is secret. Prefer scoped keys, webhook signature validation, callback security and separate staging targets.
- OpenAI: separate project/credential contexts for staging/production; keys server-side only; usage can be observed separately by workload.
- Google: separate Gmail OAuth from Document AI service identity; separate environments/projects where useful; EU region where required.
- Microsoft: Entra client ID is not secret; secret/certificate is. User tokens remain separate and disconnect/revoke is explicit.
- AWS: no root credentials; least-privilege Textract role, preferably temporary/provider-native credentials; separate staging/production roles.
- Azure: endpoint plus key/identity; environment separation, rotation, region selection; evaluate managed identity later.

## Staging contract
STAGING has separate redirects/webhooks and separate keys/apps where possible, synthetic users, sandbox/test providers, and no customer rollout. PRODUCTION has separate credentials/callbacks, restricted access and a feature-flag gate. There is no implicit environment inheritance.

## Cutover gate
Production requires all of: working staging credential; scope review; DPA/provider-terms review; secret-storage review; rotation/revocation; tested audit redaction; E2E pass; feature flag; rollback.

## Rotation, revocation, incident response
Rotation is capability-aware and must never be claimed when unsupported. Compromised credentials cannot return to ACTIVE. Disconnect attempts are idempotent; provider revoke is used where possible, local references are disabled/deleted, connection becomes DISCONNECTED, and future syncs stop. Incident records contain identifiers/status/action only, never values.

## Logging and n8n execution safety
Redact password, token, access_token, refresh_token, authorization, api_key, secret, client_secret, cookie and session recursively. Safe errors contain only provider, credential ID, environment and error category. n8n nodes must not echo authorization headers, credentials or provider responses containing secrets. `saveManualExecutions=false` remains an external production invariant; this branch does not alter n8n.

## Authorization
Server-side only. A customer can manage only their own ProviderConnection. Family relationship alone grants no credential access. End-user scopes are `provider_connection.read`, `.create`, `.disconnect`; `secret.read` does not exist.

## Secret inventory
The code contains a value-free inventory for OpenTable, TheFork, Verivox, CHECK24, Twilio, OpenAI, Microsoft, Gmail, GMX, WEB.DE, T-Online, TIMIFY, Calendly, Google Document AI, Azure, AWS and DB/VBB. Each entry records credential shape, platform/user ownership, staging-separation recommendation and store class. Production remains gated by the common cutover contract.
