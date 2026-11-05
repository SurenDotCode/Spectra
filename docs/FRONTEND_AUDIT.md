# Frontend audit

Starting commit: `e52184c2fb8f2fe9363119ff09bb901dbf698d07`.

Scope: presentation, copy, frontend-only tests and the three requested design documents. Backend, API contracts, client request handlers, recording lifecycle, schema, security, jobs, infrastructure and existing non-browser tests are frozen.

| Screen                   | Cut / consolidate                                                                                                            | Presentation change                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Landing                  | “A clearer signal”, method grid, repeated offer/evidence/outreach explanations, caption, long promise                        | One centered headline, short support, a single Talk link with microphone visual; one honest footer disclaimer         |
| Session                  | Numbered explanatory headings, lengthy placeholder, separate “First, a clear picture” panel, duplicated confirmation warning | Single conversation column; editable transcript above existing recorder; quiet file input; compact market preferences |
| Confirmation             | “Here’s what I understand”, repeated save/research explanation                                                               | Editable compact summary; Looks right action; existing validation and submit preserved                                |
| Progress                 | “Follow the signals”, candidate-count paragraph                                                                              | Finding / Reading / Contacts / Ranking timeline, real counts and existing retry controls                              |
| Prospects                | Repeated board explanation; lengthy missing-contact and people text; decorative action symbols                               | Compact rows, fit score, evidence tabs, visible focus, docked conversation; source and evidence text preserved        |
| Conversation             | Three example questions, long text-input label, repeated evidence paragraph                                                  | One short example, Question label, Ask action; answer text and speech logic preserved                                 |
| History                  | Long empty-state explanation, discovery jargon                                                                               | New search / Saved prospects; compact rows                                                                            |
| Settings                 | Long usage paragraph, duplicate audio explanations                                                                           | Consistent glass sections, compact usage rows, same controls and destructive confirmation text                        |
| Auth                     | Heading/subheading repetition, long button labels                                                                            | Centered glass form; same field names and actions                                                                     |
| Error/loading/empty      | Descriptive filler                                                                                                           | Short sentences, clear retry/navigation actions                                                                       |
| Legal                    | No substantive edits                                                                                                         | Theme and readable line length only                                                                                   |
| Frontend email templates | None exist in frontend                                                                                                       | Supabase templates are outside scope and remain unchanged                                                             |

## Scope decisions

- Preserve tap-to-start/tap-to-stop recording and the existing keyboard activation. Hold-Space shortcuts and automatic speech interruption are new behaviors and are not added.
- Transcripts arrive after transcription; no simulated streaming text or waveform is shown. The existing waveform remains driven by actual microphone input.
- Voice editing of profile fields is not implemented by the existing flow. Editable text fields remain intact.
- Landing uses an honest microphone entry link to the existing session, not a fake live demo or a new recording flow.
- No new speaking-state detection is added. Existing processing/recording flags may style presentation; Stop speaking remains available with every existing speech control.
- Runtime provider errors, generated answers and genuine evidence are retained verbatim. Backend strings and schemas are immutable; their length exceptions are documented in COPY.md.

Final verification and changed-file summary will be appended after checks.

## Verification — 5 November 2026

- Typecheck, ESLint, production build and all 67 existing unit/integration/security tests passed. Existing non-browser test files were not edited.
- Local Supabase: both original pgTAP files passed, 86 assertions, including isolation and RLS. Migrations and policies are unchanged.
- All 13 Playwright tests passed. Original security assertions remain unchanged. Added coverage exercises the typed offer → confirmation → research → prospects → first-prospect discussion flow, active speech stop and cancellation of a late speech response.
- Responsive checks cover 360, 390, 768, 1024, 1280 and 1536px across ten screens. No horizontal overflow. Axe checks at 390 and 1280px include WCAG 2 A/AA, 2.1 AA and 2.2 AA tags, plus light settings and reduced-motion rendering; no reported violations. Automated checks do not constitute a complete accessibility certification.
- Screenshots capture landing, session, confirmation, research, prospects, history, settings in both themes, sign-in, legal pages and 404. Research/prospect/history/usage screenshots use explicitly named test fixtures, not production data.
- Manual screenshot review corrected mobile meter width and spacing, and ensured the landing fits one viewport. Source details remain scrollable within the desktop detail panel.
- Runtime dependency audit: zero known vulnerabilities. Tracked-file secret pattern scan passed. No dependency or lockfile changes.
- AST comparison of every existing frontend `api` and `readApi` call against the starting commit found identical call expressions, ignoring formatting only.
- `/design` is inaccessible in production and checked by browser tests. No backend behavior, routes, schemas, security headers, auth handlers, quotas, environment variables or infrastructure configuration changed.

## Upstream preservation

During the work, the owner added commit `f64ad2afa575c23a4c79639fe3c65e61bfc00988` (`Create gitignore`) on GitHub. Preserve that independent file unchanged when syncing. The redesign-only comparison uses that commit as its final base; the original starting commit remains recorded above. The extra upstream file is not part of this redesign.

## Scope summary

The patch consists only of app/component TSX presentation, the token/global CSS files, the local SVG favicon, frontend-only browser tests, and the three allowed new documents. Backend, database, auth callbacks, client API library, security/provider/research libraries, configuration, package manifests/lockfiles and non-browser tests remain byte-for-byte identical to the original starting commit.

Needs owner decision only for future behavior work: live streaming transcripts, hold-Space recording, automatic speech interruption, voice editing of profile fields, and a recording demo on the landing page. These were deliberately excluded by the highest-priority presentation-only scope. Existing setup-mode/provider activation requirements are unchanged.

Final local mobile Lighthouse run: Performance 99, Accessibility 100, Best Practices 100, SEO 100. This measures the production build on localhost with simulated mobile throttling, not a guarantee of deployed field performance.

Redesign diff summary: 27 files — 23 frontend presentation files, one frontend-only browser test file, and the three permitted documents. No new packages or lockfile changes.
