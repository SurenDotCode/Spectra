# Adversarial self-review

Reviewed 2026-11-04. This is an engineering self-review, not an independent penetration test.

| Attempt / finding | Resolution | Evidence |
|---|---|---|
| Read, insert, update or delete another tenant's records | FORCE RLS and owner policies on all 16 tables; composite owner foreign keys | PGlite tests and 86 local Supabase pgTAP assertions |
| Race two expensive jobs / overspend counters | Advisory transaction locks, idempotency keys, one active search; atomic global and account counters | database.test.ts and controls.test.ts |
| Fetch metadata, alternate IP encodings, private DNS or redirect to loopback | Central policy check and DNS pinning; recheck redirects and robots; deny LinkedIn fetching | ssrf.test.ts, transport.test.ts |
| Huge, compressed, slow or active documents | Byte limits, identity encoding, request timeout, type allowlist, worker time/memory ceiling | upload.test.ts, transport.test.ts |
| Invent a contact or mislabel phone as WhatsApp | Require company-domain source and literal published contact; contextual WhatsApp evidence | research.test.ts |
| Declare unsupported location / integration / role | Drop unsupported integrations, show Not found for location/role; industry marked inferred | verify.ts; remaining semantic misinterpretation risk documented |
| Upload/page prompt injection | Strip active/hidden HTML, model instructions label data as untrusted; no side-effect tools; schema + evidence post-check | security.test.ts, pipeline.test.ts |
| Stored script or spreadsheet formula | React escapes text, dangerous HTML lint ban, CSV BOM and formula neutralization | browser stored-XSS test and csv.test.ts |
| Forged origin / setup-mode auth bypass | Origin/token validation; verified server identity and setup fail-closed | browser real API negative tests and security.test.ts |
| Speech starts after stop / recording survives navigation | Request epoch cancellation; audio pause; microphone and AudioContext cleanup | voice.tsx; recording browser test (mock STT) |
| Compound agency/country refinement silently loses country | Combined intent support and shared geography matching | conversation.test.ts |
| Low-contrast label in dark theme | Labels inherit theme foreground | Lighthouse and axe |

Unresolved: live provider behavior, paid-provider spend calibration, hosted OAuth/email/MFA/session revocation, full ASVS audit, actual model resilience to malicious text, and multi-browser assistive-technology testing. No A+ headers grade or independent security certification is claimed.
