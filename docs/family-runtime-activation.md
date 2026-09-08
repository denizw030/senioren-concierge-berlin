# Family Website Runtime Activation

## Frozen contract

- Website candidate branch: `feat/family-runtime-activation-20260908`
- Platform contract SHA: `e63d09682c9a919a9ab347ff27d197f2a3c10a18`
- Family contract: `family-owner-sponsored-access-v1`
- Canonical gateway: `https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access`
- Website runtime config endpoint: `GET /api/runtime-config`

The website defaults fail-closed. If `FAMILY_GATEWAY_BASE` is unset, empty, or differs from the canonical gateway, `/api/runtime-config` returns `family_runtime_enabled:false` and `family_gateway_base:null`. The browser adapter performs no Family gateway request in that state.

## Exact activation

Perform only after the Platform production migration/function/runtime gates are independently approved.

1. In the Vercel project for `nahwerkconcierge.com`, set the **Production** environment variable:
   - Name: `FAMILY_GATEWAY_BASE`
   - Value: `https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access`
2. Redeploy the **same tested website commit** from `feat/family-runtime-activation-20260908`; do not modify source code.
3. Verify:
   - `GET https://nahwerkconcierge.com/api/runtime-config`
   - must return `ok:true`
   - `family_contract:"family-owner-sponsored-access-v1"`
   - `platform_contract_sha:"e63d09682c9a919a9ab347ff27d197f2a3c10a18"`
   - `family_runtime_enabled:true`
   - `family_gateway_base:"https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access"`
4. Run the authenticated read smoke:
   ```sh
   FAMILY_GATEWAY_BASE='https://djicahhmnnamtjuqedqd.supabase.co/functions/v1/nahwerk-family-access' \
   FAMILY_RUNTIME_TOKEN='<real-owner-web-session-token>' \
   FAMILY_SMOKE_MODE=read \
   node scripts/family-runtime-smoke.mjs
   ```

## Full mutation smoke

Use only with disposable Family fixtures. It performs entitlement round-trip, suspend, resume, invitation creation/revoke, and finally revokes the disposable managed access.

Required:
- `FAMILY_SMOKE_MANAGED_PERSON_ID`
- `FAMILY_SMOKE_INVITATION_JSON`
- `FAMILY_SMOKE_MODE=full`
- `FAMILY_SMOKE_DESTRUCTIVE_ACK=I_UNDERSTAND_THIS_REVOKES_TEST_ACCESS`

## Exact rollback

1. Remove/unset the Vercel **Production** environment variable `FAMILY_GATEWAY_BASE`.
2. Redeploy the **same website commit**; no source rollback is required.
3. Verify `GET https://nahwerkconcierge.com/api/runtime-config` returns:
   - `family_runtime_enabled:false`
   - `family_gateway_base:null`
4. Reload `konto.html`. The Family adapter is inert and makes zero Family gateway requests.

If an earlier website artifact must be restored instead, redeploy the frozen pre-activation website SHA `de14206f327e089aebd7105bdd8be8c89d104521`.
