# NAHWERK Outbound Call Core

Isolated, non-production core. No Twilio/SIP credentials, PSTN calls, reservations, WhatsApp sends, n8n changes, Supabase migrations, Active Production changes, or Prime changes.

## Target architecture

Twilio Programmable Voice or SIP/PSTN ↔ Voice Gateway ↔ OpenAI Realtime voice agent ↔ scoped Tool/Call Orchestrator ↔ NAHWERK Action Context.

The provider boundary deliberately exposes create/cancel/status/audio/DTMF/transfer operations while `TwilioVoiceAdapter` and `SIPVoiceAdapter` remain non-live. `FixtureVoiceAdapter` is test-only.

## Current official capability research (2026-08-26)

Twilio Programmable Voice supports outbound calls to phone numbers and SIP addresses, call progress callbacks, status values including queued/ringing/in-progress/completed/busy/failed/no-answer/canceled, DTMF via sendDigits, maximum call time, redirect/end of in-progress calls, and call transfer patterns using Dial/child calls. Recording is optional and is intentionally disabled by this core.

OpenAI Realtime is suitable for server-side low-latency speech-to-speech agents with audio I/O, instructions, function/tool calling, interruption/turn handling, and SIP connectivity. OpenAI announced Cedar and Marin as Realtime API voices in 2025. The NAHWERK mapping is Nilo→cedar and Mira→marin. The core keeps voice persona separate from person identity and memory.

## Disclosure and scope

A connected call must pass AI_DISCLOSURE before IN_CONVERSATION. Default German disclosure: “Guten Abend, hier spricht der digitale Concierge von NAHWERK im Auftrag eines Kunden.” If disclosure is required but not marked spoken, the call fails closed.

Tool access is allowlisted per action. Restaurant availability cannot confirm a reservation. Restaurant reservation can prepare/confirm only when the original authorization scope permits it. Payment/card/PIN/TAN/auth-code handling is not exposed.

## Reservation approval boundary

Auto-confirmation requires explicit auto-reserve authorization, identical requested/offered time and party size, and no deposit, cancellation/no-show fee, minimum spend, prepayment, card requirement, or material condition. Otherwise the result is NEEDS_USER_INPUT.

## Privacy defaults

No call recording. Live processing only. Structured result preferred over transcript. Transcript retention defaults to `none`. Provider metadata is separated from customer result. Audit stores lifecycle facts, not audio. Sensitive customer details must not be placed in voicemail; voicemail is expected to be disabled by the eventual production gateway unless explicitly approved.

## Germany legal review boundary

This core is designed for user-initiated service/availability calls, not advertising. Before production, German counsel/privacy review should confirm the exact calling setup, controller/processor roles, transparency wording, data-processing agreements/transfers, retention, and whether any planned recording/transcription has a sufficient legal basis. Audio recording is not enabled because recording non-public speech can engage §201 StGB and data-protection duties. Advertising-call rules under §7 UWG remain a separate hard boundary; NAHWERK must not repurpose this service path for marketing.

## External prerequisites before live use

Approved telephony account/number and outbound permissions; credentials stored outside source; production Voice Gateway; signed/validated provider webhooks; OpenAI API project with the selected Realtime model/voices; latency/interrupt/DTMF/voicemail testing; explicit human-handoff destination and authorization; abuse/rate controls; observability without sensitive audio; DPIA/privacy/legal review where required; production authorization and Family hooks; and end-to-end sandbox/staging tests before any real customer call.
