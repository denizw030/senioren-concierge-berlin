# Android Intelligence Mode PROD v1

- Default mode: `ECONOMY`
- Optional mode: `SMART`
- SMART activation requires explicit acknowledgement of higher AI consumption.
- Exact customer surcharge remains `CALIBRATION_PENDING`; the app must not invent a price.
- Persistence is person-scoped through the canonical `intelligence-mode-v1` contract.
- This surface does not itself authorize provider calls, WhatsApp sends, TTS, or payments.
