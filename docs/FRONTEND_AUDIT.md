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
