# NW-EMAIL-CONCIERGE-CORE-01 – Provider Research

Research date: 2026-08-26. Phase 1 is read-only; no live mailbox is connected.

## Gmail
Official Google OAuth/Gmail API documentation supports `gmail.readonly` for viewing messages/settings and `gmail.metadata` for metadata-only access. The adapter target is OAuth 2.0 + Gmail API, using metadata/header-first and content/attachments on demand. Gmail-native threads/labels are provider metadata and remain separate from the normalized model.

Official sources:
- https://developers.google.com/identity/protocols/oauth2/scopes#gmail
- https://developers.google.com/workspace/gmail/api/guides

## Microsoft Outlook / Hotmail / Microsoft 365
Microsoft Graph documents delegated `Mail.ReadBasic` as least-privileged for basic message properties and `Mail.Read` for reading the signed-in user's mailbox. `Mail.Send` is a distinct permission and is intentionally not enabled by this core. Adapter target: OAuth + Microsoft Graph.

Official sources:
- https://learn.microsoft.com/en-us/graph/permissions-reference
- https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0

## GMX
GMX officially documents IMAP/POP3 for external mail programs. POP3/IMAP must be enabled in account settings. With two-factor authentication, an application-specific password is required for an external mail program. No OAuth capability is asserted by this core.

Official sources:
- https://hilfe.gmx.net/pop-imap/index.html
- https://hilfe.gmx.net/sicherheit/2fa/anwendungsspezifisches-passwort.html

## T-Online / Telekom Mail
Telekom documents an independent “E-Mail-Passwort” for mail programs and encrypted IMAP (`secureimap.t-online.de`, port 993, SSL/TLS). The core therefore models T-Online as secure IMAP with an e-mail-program password; it does not assert OAuth.

Official source:
- https://www.telekom.de/hilfe/downloads/handbuch-email-center.pdf

## WEB.DE
WEB.DE officially documents IMAP/POP3 for external mail programs; access must be enabled in account settings. It also documents application-specific passwords for external programs, especially with 2FA. No OAuth capability is asserted by this core.

Official sources:
- https://hilfe.web.de/pop-imap/index.html
- https://hilfe.web.de/sicherheit/2fa/anwendungsspezifisches-passwort.html

## Architecture boundary
`GmailConnector`, `MicrosoftGraphConnector`, and `ImapConnector` are non-live boundaries. `FixtureEmailConnector` is the only executable test connector. Write methods exist on the connector interface but throw `ExecutionNotAllowed`; write intent is represented as PREPARE data for the central Action/Approval Core. Document and fraud processing are dependency hooks only; their existing core logic is not duplicated. Credentials are represented only by an opaque `credential_ref`, never credential values.
