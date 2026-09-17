# NAHWERK iOS

Native SwiftUI client for the canonical NAHWERK customer system.

## Verified production contracts

- PROD functions base: `https://djicahhmnnamtjuqedqd.supabase.co/functions/v1`
- Login / MFA: `web-login-secure`
- Session validation / logout: `web-session-secure`
- Authenticated APP channel: `nahwerk-app-gateway/mobile/*`
- Shared APP/WEB/WHATSAPP history reader: `nahwerk-web-gateway/web/history`
- Canonical splash coin: Android reference chunks in `android-app/app/src/main/splash-reference`, SHA-256 `40d81ef0f53c31a48cc9ca2ec2ca8dfca2ead41c897aa0c1a673ddac43a980a3`

The iOS target does **not** own Persona, Memory, History, Account, Usage, entitlement or action authority.

## Intentionally unresolved gates

The current PROD Core requires a resolved `person_id` for `/v1/core/turn`. Therefore real anonymous guest answers are not faked locally. The UI is chat-first, but guest network turns remain fail-closed until a canonical Core guest-turn path exists.

The current APP gateway also has no canonical "new conversation" endpoint. The client does not pretend that clearing the screen creates a new server conversation.

Production Apple identifiers are intentionally not invented. XcodeGen expects:

- `NAHWERK_IOS_BUNDLE_ID`
- `NAHWERK_IOS_DEVELOPMENT_TEAM`

## Generate the Xcode project

```bash
cd ios-app
xcodegen generate
open NAHWERK.xcodeproj
```

Signing and a real iPhone build require the verified Apple Bundle ID and Team ID.
