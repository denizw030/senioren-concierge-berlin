# NAHWERK Android – Backend Contract Gaps

## Purpose and architecture freeze

This document records Android-client capabilities that remain deliberately blocked because no complete, confirmed backend contract is available to this client.

The architecture remains:

`Android Client -> Backend/Core -> canonical Conversation / Task State -> Result -> Android Client`

`CHANNELS DO NOT OWN BUSINESS LOGIC.`

`ONE PERSON -> ONE CONVERSATION -> ONE TASK STATE -> ONE CORE.`

The Android app does not define canonical conversation, task, approval, memory, safety or family truth. It must not invent endpoints, payload keys, state machines, identifiers or success conditions. Any names below describe semantic requirements only; the final transport, method, path and field names remain **TBD until confirmed by the backend contract**.

---

## 1. Conversation History

**STATUS: BLOCKED**

### Required backend contract
An authoritative, authenticated read contract for the canonical conversation history owned by the central Concierge Core, including documented ordering and pagination/resume semantics.

### Expected request
An authenticated request that identifies the caller and the canonical conversation using identifiers issued or accepted by the confirmed backend contract. If pagination is supported, its cursor/range semantics must be documented. HTTP method, endpoint path and exact payload/query fields are **TBD**.

### Expected response
An ordered canonical set of conversation turns sufficient for rendering and resuming the same conversation, with server-stable turn/message identifiers and any timestamps/status fields the backend explicitly defines. Exact schema is **TBD**.

### Required IDs
- canonical conversation identifier supplied/confirmed by the backend
- server-stable turn/message identifiers
- authenticated person/session context

The Android client must not synthesize canonical conversation or turn IDs.

### Idempotency requirement
The history read must be side-effect-free. Repeating the same read must not create a new turn, task or action. If cursor-based pagination is used, cursor semantics must be deterministic and documented.

### Error behavior
Authentication failure must follow the session contract. Transport/server failure must surface as unavailable/retryable without replacing local UI state with guessed canonical history. Malformed or incomplete responses must not be accepted as authoritative history.

### Why the client remains fail-closed
The current encrypted local chat UI snapshot exists only to preserve client presentation/state across recreation. It is **not** treated as canonical conversation history. No history synchronization UI is enabled until the server contract is confirmed.

---

## 2. Task / Execution Details

**STATUS: BLOCKED**

### Required backend contract
An authoritative read contract for canonical task and execution state owned by the Concierge Core, including any result/status values that are safe for the client to display.

### Expected request
An authenticated read using server-issued/confirmed references for the relevant canonical task, execution and/or conversation. HTTP method, endpoint path and exact request fields are **TBD**.

### Expected response
Canonical task/execution state, verified result information, timestamps and other display-safe metadata explicitly defined by the backend. Exact schema and allowed state values are **TBD**.

### Required IDs
- canonical task identifier
- execution identifier if the backend models execution separately
- canonical conversation identifier when required by the backend

All canonical identifiers must come from the backend contract.

### Idempotency requirement
A details read must be side-effect-free. Re-reading status must not re-execute a task or create a new task/action.

### Error behavior
Missing, delayed or unavailable data must never be interpreted locally as success, failure or completion. Unknown states remain unknown/unavailable.

### Why the client remains fail-closed
The app does not expose task/execution details as canonical truth until a complete backend read contract and state vocabulary are confirmed.

---

## 3. Approval Continuation

**STATUS: BLOCKED**

### Required backend contract
An explicit Core-owned approval contract that presents the current approval state and accepts approve/reject continuation **for the same canonical task**.

### Expected request
After the user approves or rejects, the client must submit an authenticated continuation bound to the existing server-issued approval/task/conversation references plus a stable client idempotency identity for that continuation. HTTP method, endpoint path, exact payload fields and approval vocabulary are **TBD**.

A generic user message such as `Ja` must never cause the Android client to create or infer a new task.

### Expected response
A canonical acknowledgement and next state for the **same task**, including any resulting continuation/execution/result state that the Core explicitly returns. Exact schema is **TBD**.

### Required IDs
- server-issued approval reference
- canonical task reference
- canonical conversation reference where required
- stable client request/idempotency identity for the approval command

Exact field names remain **TBD**.

### Idempotency requirement
Approval continuation must be idempotent across retries so a network retry cannot execute the approved action twice or create a second task.

### Error behavior
On timeout, ambiguous response or server error, the client must keep the approval unresolved and must not claim approval, rejection, execution or completion. A retry must reuse the contract-defined stable request identity.

### Why the client remains fail-closed
There is no active Approval Continuation UI/wiring because the complete same-task continuation contract has not been confirmed. The app therefore performs no local interpretation of approval language.

---

## 4. Audio Input

**STATUS: BLOCKED**

### Required backend contract
An authenticated media-ingestion contract that defines supported audio formats/codecs, size/duration limits, upload/stream semantics and how audio becomes input to the **same central Concierge Core and conversation**.

### Expected request
Captured audio plus contract-defined metadata, canonical conversation linkage and a stable client media-request identity. Transport method, HTTP/realtime mechanism, endpoint path and exact fields are **TBD**.

### Expected response
A server-issued media/turn reference and canonical processing/result state sufficient to associate the audio with the same conversation. Whether transcription is returned is a backend contract decision. Exact schema is **TBD**.

### Required IDs
- canonical conversation reference
- stable client media request/idempotency identity
- server-issued artifact/turn/task references if defined by the backend

### Idempotency requirement
Retrying an interrupted/ambiguous media submission must not create duplicate canonical turns or executions. The backend contract must define retry identity and completion acknowledgement.

### Error behavior
Capture/upload/processing failures remain explicit failures or pending states. The client must never fabricate a transcript, Core response or successful submission.

### Why the client remains fail-closed
Microphone capability may be prepared at platform level, but no live audio-to-Core wiring is enabled until the complete backend contract is confirmed.

---

## 5. File / Image Upload

**STATUS: BLOCKED**

### Required backend contract
An authenticated upload/ingestion lifecycle defining allowed MIME types, file/image limits, security validation, attachment semantics and how an uploaded artifact becomes input to the same canonical conversation/Core.

### Expected request
File/image bytes or the backend-defined upload transport, contract-defined metadata, canonical conversation linkage and a stable upload/request identity. HTTP method, upload mechanism, endpoint path and exact fields are **TBD**.

### Expected response
A server-issued artifact reference plus canonical ingestion/turn/task/result state explicitly defined by the backend. Exact schema is **TBD**.

### Required IDs
- canonical conversation reference
- stable client upload/request idempotency identity
- server-issued artifact/turn/task references as defined by the backend

### Idempotency requirement
Upload and any subsequent submit/attach operation must have documented idempotency semantics so retries cannot create duplicate artifacts, turns or tasks.

### Error behavior
An ambiguous or failed upload must not appear as attached, processed or completed. The client may retain only clearly local pending UI state where safe; it must not promote that state to server truth.

### Why the client remains fail-closed
No file/image upload is live-wired because the authoritative upload lifecycle and Core-ingestion contract are not confirmed.

---

## 6. Family Display

**STATUS: BLOCKED**

### Required backend contract
An authoritative authenticated read contract for Family relationships, membership/status and the permissions/display scope the current caller is allowed to see.

### Expected request
An authenticated request in the caller's account/person context. Any family owner/member/relationship reference must be supplied according to the confirmed backend authorization contract. HTTP method, endpoint path and exact fields are **TBD**.

### Expected response
Only authorized Family entities/relationships, their canonical status and display-safe permission information as defined by the backend. Exact schema is **TBD**.

### Required IDs
- backend-owned account/person/member references as applicable
- backend-owned family/relationship reference if such a concept exists in the confirmed contract

The Android client must not derive relationship authority from names, phone numbers or local state.

### Idempotency requirement
Family display is read-only and must be side-effect-free. Any later invitation/permission mutation requires a separate explicit mutation contract and idempotency rules.

### Error behavior
Unavailable data must not be treated as "no family" or as permission. Authorization errors must not leak relationship data. Unknown permission remains unavailable/denied in the client.

### Why the client remains fail-closed
No Family business rules or permission logic are implemented locally, and no Family display is activated until an authoritative read/authorization contract is confirmed.

---

## 7. Safety Display

**STATUS: BLOCKED**

### Required backend contract
An authoritative Core/backend representation of Safety-related state that is explicitly safe for the Android client to display, including any permitted user acknowledgement/continuation semantics if such actions exist.

### Expected request
Either a contract-defined canonical result already delivered through the central conversation flow or an authenticated side-effect-free read using backend-issued references. The transport form, HTTP method, endpoint path and exact request fields are **TBD**.

### Expected response
Canonical Safety state/message plus only the display-safe status/action restrictions explicitly defined by the backend. Exact schema and vocabulary are **TBD**.

### Required IDs
Where the backend contract requires them:
- canonical conversation reference
- canonical task/result reference
- server-issued Safety event/reference if such an identifier is defined

The Android client must not create canonical Safety identifiers or derive Safety state itself.

### Idempotency requirement
A Safety display/read must be side-effect-free. Any acknowledgement or continuation must use a separately confirmed, idempotent contract; displaying state must never trigger escalation or other action.

### Error behavior
Unknown, unavailable or malformed Safety state must not be interpreted as "safe", "resolved" or permission to proceed. The client must show unavailable/error state rather than make a Safety decision.

### Why the client remains fail-closed
Safety decisions remain exclusively backend/Core-owned. The Android app has no local Safety decision engine and exposes no active Safety state/action UI until the display/continuation contract is confirmed.

---

## Activation gate

These seven areas may move from **BLOCKED** only after the corresponding backend contract is confirmed and versioned, including authentication/authorization, exact transport/schema, canonical identifiers, idempotency/retry semantics, error behavior and success acknowledgement.

Until then the Android client remains fail-closed and does not fake activation, success, canonical state or business authority.
