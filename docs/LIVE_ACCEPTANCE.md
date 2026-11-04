# Live acceptance — not yet executed

Run in an isolated protected Preview with small provider-side spend caps. Record actual date, deployment commit, operator, provider/model and result. Never include credentials or personal account exports in the report.

| Scenario | Expected evidence | Result |
|---|---|---|
| Email signup | Turnstile validated, email confirmation required, no protected API before verification | Pending |
| Google OAuth | Exact callback succeeds, unrelated redirect rejected, verified identity enforced | Pending |
| TOTP | Enroll/verify succeeds; protected operations require the configured assurance level | Pending |
| Logout | Old cookie/refresh attempt rejected; a separate session cannot keep using a revoked session | Pending |
| Two tenants | Attempt owned-ID substitution for offer/search/prospect/conversation/export; deny cross-tenant rows | Pending |
| Voice | Real Prisma transcription, editable text; no audio record in storage; unsupported/oversize audio rejected | Pending |
| Speech | Timbre playback after gesture; Stop instantly pauses and suppresses a late response | Pending |
| Offer | Text and PDF/README extract correctly; profile remains editable; research blocked until confirmation | Pending |
| Pipeline | Real query -> source pages -> supported observations -> <=5 ranked prospects; manually inspect every cited URL and contact | Pending |
| Weak evidence | Zero/fewer results without fabricated fills; unknown workflow and demand explicitly remain unknown | Pending |
| Resumption | Interrupt after completed items; resume after lease expiry without repeating successful items | Pending |
| Quotas | Duplicate start reserves once; exhausted quota pauses; failed provider attempts remain charged against limits | Pending |
| Contacts and people | Company-published contacts, WhatsApp context, no guessed email, source-dated affiliation, no LinkedIn crawl | Pending |
| Conversation | Stable ordinals, previous focus, ambiguity question, filters, skip, concise answer, no unrequested new research | Pending |
| Outcome/history | User-reported note persists and appears in later discovery context; dismissed/contacted/seen domains excluded | Pending |
| CSV | Saved entries only; formula prefixes neutralized; source URLs included; Unicode preserved | Pending |
| Account rights | Export contains only own data; deletion removes app rows; backup retention stated accurately | Pending |
| Production runtime | PDF worker bundle loads; DNS-pinned HTTP uses Node runtime; strict CSP allows intended Turnstile/audio flow | Pending |
| Scheduler | Authorized tick advances a stage; wrong bearer denied; frequent schedule supported by chosen plan | Pending |
| Kill switches | Account block and global provider stop take effect; no unexpected provider billing | Pending |
| Accessibility | Keyboard and screen reader across all flows, zoom/reflow, light/dark, reduced motion, microphone denial | Pending |

Passing local mocks is not a substitute for these results. Do not remove deployment protection or present the app as production-ready until applicable launch gates are resolved.
