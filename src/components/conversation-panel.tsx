"use client";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/lib/client-api";
import {
  conversationReplySchema,
  type ConversationReply,
} from "@/lib/conversation";
import { VoiceInput, SpeakButton } from "./voice";
export function ConversationPanel({
  searchId,
  ids,
  focused,
  onReply,
}: {
  searchId: string;
  ids: string[];
  focused?: string;
  onReply: (reply: ConversationReply) => void;
}) {
  const [conversationId, setConversationId] = useState<string>();
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="chat stack">
      <div className="eyebrow">Conversation</div>
      <p className="small muted">“What about the first one?”</p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const r = await api(
              "/api/conversation",
              {
                searchId,
                conversationId,
                displayedIds: ids,
                focusedId:
                  focused && ids.includes(focused) ? focused : undefined,
                text,
              },
              conversationReplySchema.extend({ conversationId: z.uuid() }),
            );
            setConversationId(r.conversationId);
            setAnswer(r.answer);
            onReply(r);
            setText("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not answer.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Question
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={3000}
          />
        </label>
        <VoiceInput onTranscript={setText} />
        <button
          className="primary"
          disabled={busy || !text.trim() || !ids.length}
        >
          {busy ? "Reading…" : "Ask"}
        </button>
      </form>
      {answer ? (
        <div aria-live="polite">
          <p>{answer}</p>
          <SpeakButton text={answer} />
          <p className="small muted">From saved evidence.</p>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
