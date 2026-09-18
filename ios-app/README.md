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

## Current guest-chat contract

Guest chat is available through the existing PROD APP gateway at `nahwerk-app-gateway/mobile/guest-chat`.

- the client keeps a random installation identifier and guest token in the iOS Keychain
- the server stores only hashes of those guest credentials
- a guest receives a temporary `person_id` but no customer account/member
- normal questions use the existing central Concierge Core
- business side effects and CAO dispatch are disabled for guests
- personal/action requests return native `SIGN_IN` / `SIGN_UP` actions instead of executing work
- the client never generates fake local assistant replies

## Intentionally unresolved gates

The current APP gateway has no canonical "new conversation" endpoint for authenticated APP conversations. The client does not pretend that clearing the screen creates a new server conversation.

Guest-to-customer server-side conversation claiming is not yet canonical. The visible in-app guest transcript is preserved locally across sign-in during the active app session, but no guest Core receipts are reassigned to a customer account without an explicit server contract.

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
