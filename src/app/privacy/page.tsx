export default function Privacy() {
  return (
    <article className="page shell stack">
      <div className="eyebrow">Policy draft · 4 November 2026</div>
      <h1>Privacy, with provenance.</h1>
      <p role="note">
        Owner and legal review required before public launch. The operator must
        add its legal identity, privacy contact, processing grounds, regions,
        subprocessors and rights procedure.
      </p>
      <h2>What Spectra processes</h2>
      <p>
        Your account, offer descriptions, text transcripts, research history,
        public business pages and contact evidence, notes and usage/security
        records. Public availability does not remove personal-data obligations.
        Do not upload confidential documents or sensitive personal data.
      </p>
      <h2>Voice and documents</h2>
      <p>
        Recordings go to Gnani for transcription and are discarded by this app
        after processing. Documents are converted to bounded text; original
        files are not stored. Transcripts and submitted text may be sent to the
        reasoning provider selected by the operator. Provider-side retention and
        training terms require separate operator review.
      </p>
      <h2>Sources and providers</h2>
      <p>
        Search queries go to the configured search service. Public pages are
        fetched with a named research crawler. Supabase stores account and
        research records; Redis enforces limits; Vercel hosts the application
        when deployed. Provider configuration determines processing locations
        and international transfers.
      </p>
      <h2>Retention and control</h2>
      <p>
        Saved profiles, results, conversations, outcomes, usage and audit
        records remain until account deletion. Research cache entries expire
        after seven days and are removed during scheduled maintenance.
        Infrastructure backups and provider logs follow their own
        operator-configured retention; deletion is not a promise of immediate
        backup erasure. Settings provides account export and deletion.
      </p>
      <h2>Cookies and rights</h2>
      <p>
        Essential cookies support authentication and request protection. Theme
        preference may be stored locally. No advertising tracker is included.
        The operator must publish a contact for access, correction, objection,
        restriction, deletion, portability and complaints where applicable, and
        assess GDPR, UK GDPR and India DPDP requirements before accepting users.
      </p>
    </article>
  );
}
