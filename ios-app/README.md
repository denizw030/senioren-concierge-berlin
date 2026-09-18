# NAHWERK Concierge iOS

Native SwiftUI client for the canonical NAHWERK PROD architecture.

## Current scope

- native dark NAHWERK shell;
- public guest Concierge through `nahwerk-app-gateway/mobile/guest-chat`;
- product login through `web-login-secure`;
- SMS/TOTP MFA continuation;
- product session stored in iOS Keychain;
- authenticated `mobile/me` bootstrap;
- authenticated `mobile/chat`;
- server-owned Core/CAO authority only;
- no client-owned Billing, Safety, Family, Voice or provider execution logic.

## Build

The project definition uses XcodeGen so the repository stays diff-friendly.

```bash
cd ios-app
xcodegen generate
xcodebuild -project Nahwerk.xcodeproj -scheme Nahwerk -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

GitHub Actions performs this simulator build without an Apple Developer membership.

## App Store boundary

Public App Store/TestFlight distribution still requires Apple Developer membership, signing credentials and App Store Connect. No signing secret or certificate belongs in this repository.
