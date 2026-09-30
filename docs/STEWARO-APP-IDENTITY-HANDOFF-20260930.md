# App handoff identity isolation

A behavioral test reproduced retention of a previous App tab/remembered session while a new Account handoff was pending. Although the messenger waited for the bootstrap promise, other auth modules could synchronously restore the old local identity.

On any handoff, bootstrap now clears both previous session stores before checking or claiming the capability. A successful claim installs only the new session; failure cannot restore an earlier remembered identity. Normal App visits without a handoff preserve existing remember-me behavior. Both clean-route mirrors request bootstrap version3.

This is a scoped client initialization fix. Server session revocation, existing auth/MFA behavior and shared Core remain unchanged. A real authenticated cross-host journey is still gated by canonical Account/App reachability and a legitimate QA login. Five bootstrap behavior tests and existing shell, auth and exact-mirror checks are required; CI/deployment/readback remain separate proof stages.
