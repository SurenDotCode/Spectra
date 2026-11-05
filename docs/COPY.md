# Spectra copy inventory

Static frontend copy, grouped by source screen/component. Edit the corresponding source file to change the running UI. This inventory is not a runtime configuration.

Evidence, answers, extracted profile fields, source names, dates, status values and provider/server errors come from existing data. They remain verbatim under the scope lock; evidence and legal text may exceed 12 words. Backend-generated text is outside this presentation change. Dynamic profile labels remain the existing schema keys rendered with spaces. Native file-input labels are supplied by the browser.

## src/app/design/page.tsx

- Development only
- Spectra / Material study
- Static component states. No research or microphone activity.
- Actions
- Talk
- Save
- Thinking…
- Evidence
- Verified
- Inferred
- Unknown
- Concern
- Fields
- Transcript
- Tell me what you sell.
- Location
- City, country
- States
- Nothing yet. Describe your offer.
- Reading…
- Search paused. Retry when ready.
- Example progress
- Voice
- Static voice control
- Idle · Listening · Thinking
- Stop speaking
- Surface
- 20px blur. 28px radius. One raised layer.
- Saved
- 72 / 100

## src/app/error.tsx

- This view couldn’t load.
- Try again

## src/app/history/page.tsx

- History

## src/app/layout.tsx

- Skip to content
- Spectra
- Main
- Workspace
- History
- Settings
- Sign in
- No guarantees of replies or sales.
- Privacy
- Terms

## src/app/loading.tsx

- Loading…

## src/app/login/page.tsx

- Sign in
- Sign-in is unavailable while the owner completes setup.

## src/app/not-found.tsx

- 404
- This page isn’t here.
- Open Spectra

## src/app/page.tsx

- Voice-led discovery
- Find a reason
- to reach out.
- Talk through your offer. Explore businesses with evidence.
- Talk
- Opens your session. Typing works too.

## src/app/privacy/page.tsx

- Policy draft · 4 November 2026
- Privacy, with provenance.
- Owner and legal review required before public launch. The operator must add its legal identity, privacy contact, processing grounds, regions, subprocessors and rights procedure.
- What Spectra processes
- Your account, offer descriptions, text transcripts, research history, public business pages and contact evidence, notes and usage/security records. Public availability does not remove personal-data obligations. Do not upload confidential documents or sensitive personal data.
- Voice and documents
- Recordings go to Gnani for transcription and are discarded by this app after processing. Documents are converted to bounded text; original files are not stored. Transcripts and submitted text may be sent to the reasoning provider selected by the operator. Provider-side retention and training terms require separate operator review.
- Sources and providers
- Search queries go to the configured search service. Public pages are fetched with a named research crawler. Supabase stores account and research records; Redis enforces limits; Vercel hosts the application when deployed. Provider configuration determines processing locations and international transfers.
- Retention and control
- Saved profiles, results, conversations, outcomes, usage and audit records remain until account deletion. Research cache entries expire after seven days and are removed during scheduled maintenance. Infrastructure backups and provider logs follow their own operator-configured retention; deletion is not a promise of immediate backup erasure. Settings provides account export and deletion.
- Cookies and rights
- Essential cookies support authentication and request protection. Theme preference may be stored locally. No advertising tracker is included. The operator must publish a contact for access, correction, objection, restriction, deletion, portability and complaints where applicable, and assess GDPR, UK GDPR and India DPDP requirements before accepting users.

## src/app/prospects/page.tsx

- Your research
- Prospects

## src/app/research/page.tsx

- Research

## src/app/settings/page.tsx

- Settings

## src/app/terms/page.tsx

- Terms draft · 4 November 2026
- Evidence before outreach.
- Owner and legal review required before public launch. Operator identity, contact details, applicable jurisdiction, commercial terms and dispute procedure must be completed.
- Research assistance
- Spectra suggests plausible businesses from public evidence. A fit score is a research judgment, not proof of demand, accuracy, exclusivity or willingness to buy. Check source dates and verify current roles, contact details and need yourself. A publicly listed email is not verified deliverable and does not establish consent.
- Responsible use
- Use only material you are entitled to process. Respect website terms, robots policies, privacy rights and provider conditions. Do not use Spectra for harassment, sensitive profiling, credential collection or bypassing access controls.
- Outreach stays with you
- Spectra never sends messages or places calls for you. You remain responsible for a lawful basis, consent where required, identification, opt-out handling and applicable anti-spam rules, including CAN-SPAM, UK PECR and Canadian CASL. Public business contact information is not blanket permission to market.
- Availability and accounts
- Provider access, credits and rate limits affect availability. Research may return fewer results, pause or need retry. Protect your account and consider MFA. Export or delete account data in Settings. The operator may suspend abusive use and must publish a fair support and complaints process before launch.

## src/app/workspace/page.tsx

- New session
- What do you sell?

## src/components/conversation-panel.tsx

- Conversation
- “What about the first one?”
- Could not answer.
- Question
- Reading…
- Ask
- From saved evidence.

## src/components/history.tsx

- Loading history…
- No searches yet.
- History unavailable.
- Start a search
- View saved prospects
- View prospects
- Resume research

## src/components/login-form.tsx

- Done.
- Could not continue.
- Sign in
- Create account
- Email
- Password
- Use at least 12 characters. Verify your email before researching.
- Working…
- Continue with Google

## src/components/offer-workspace.tsx

- English
- Unable to understand this offer.
- Your offer
- Talk, or type what you sell.
- Upload a document · MD, TXT, PDF · 2 MB
- Documents must be under 2 MB.
- Document read. Review the text before submitting.
- Upload failed.
- Your market
- Search reach
- Nearby + worldwide
- Nearby
- Worldwide
- Location
- City, country
- Countries
- Comma-separated countries
- Languages
- Thinking…
- Review offer
- Could not save.
- Review your offer
- Fill in the gaps:
- $1
- Review now. Start research on the next screen.
- Looks right
- Your offer summary appears here.

## src/components/prospect-board.tsx

- Checked today
- Could not load prospects.
- Could not save.
- Save at least one prospect before exporting.
- Export failed.
- Public contacts. Deliverability unverified.
- Export CSV
- Find more
- Status
- Active
- Shortlisted
- Contacted
- Dismissed
- All
- Geography
- City or country
- Business type
- Brand, agency…
- Contact channel
- Any
- Minimum fit
- All qualified
- 70+
- 85+
- Loading prospects…
- No matching prospects.
- Broaden the filters or start another search.
- Describe offer
- / 100
- Inference
- Verified
- Inferred
- Unknown
- “
- ”
- Source-backed text, not confirmed demand.
- Concerns & scoring
- Mismatches
- None identified from available evidence; not a guarantee.
- Reasons to skip
- None identified.
- Saved
- Save
- Mark contacted
- Restore
- Skip
- Discuss
- In focus
- Need is unconfirmed.
- Contacts
- Publicly listed email
- No public contact found.
- People
- Company-page affiliation evidence
- Affiliation unconfirmed
- LinkedIn profile ↗
- No relevant person verified.
- Ask this first
- Outreach notes
- Your outreach note
- Outcome
- Other / note
- Already has a solution
- Not a fit
- Not now
- Interested
- No reply
- Saved as user-reported feedback. Future searches will consider it.
- Could not save note.
- Save outcome
- User-reported notes. Nothing is sent.

## src/components/research-progress.tsx

- Progress unavailable.
- Could not start research.
- Progress
- Ready
- Finding
- Reading
- Contacts
- Ranking
- Complete
- In progress
- Waiting
- done ·
- failed
- Starting…
- Find prospects
- Pause processing
- Resume processing
- Retry failed.
- Retry
- View prospects

## src/components/settings.tsx

- Ready.
- Request failed.
- Appearance
- Light
- Dark
- Usage & security
- Usage loaded.
- No recorded usage.
- Unavailable.
- Load usage & security
- Daily: 5 batches, 300 voice seconds, 6,000 speech characters.
- Global caps also apply.
- Set up authenticator
- Add this secret to your authenticator, then verify:
- Authenticator code
- Verify code
- Your data
- Audio is discarded after transcription.
- Export my data
- To permanently delete your account, type DELETE MY SPECTRA DATA
- Delete data & account
- Could not sign out.
- Sign out of all sessions

## src/components/voice.tsx

- Transcript ready. Edit before submitting.
- Transcription failed.
- Microphone unavailable. Use the text box instead.
- Speech language
- English
- Hindi
- Tamil
- Telugu
- Kannada
- Malayalam
- Marathi
- Gujarati
- Bengali
- Punjabi
- Stop recording
- Start recording, up to 20 seconds
- Processing…
- Listening. Tap to stop.
- Tap to talk · 20 seconds maximum
- Speech unavailable.
- Preparing…
- Listen
- Stop speaking

## Dynamic display labels and metadata

- Page title: Spectra — Find the reason to reach out
- Description: Evidence-led client discovery. Real businesses, public sources, clearer conversations.
- Profile labels: purpose, problem, capabilities, integrations, pricing, limitations, customers, location, countries, languages, industry, business Size.
- Contact channels: email, phone, whatsapp, form, social.
- Research states: queued, running, completed, failed, quota.
- Relative source date: Checked today; Checked {days} day(s) ago · cached.
- Usage row: {day} · {feature}: {amount}; meter: {amount} / {limit}.
- Usage accessibility label: {feature} daily usage.
- Evidence tab accessibility label: Evidence for {business name}.
- Spoken prospect summary: existing explanation, first unknown, suggested question; unchanged.

These labels mirror existing data and schemas. They do not rename fields or alter requests.
