"use client";
import { useState, useRef, useEffect } from "react";
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
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  function cancel() {
    active.current?.abort();
    active.current = null;
    setBusy(false);
  }
  async function submit(value: string) {
    cancel();
    if (!value.trim() || !ids.length) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      const r = await api(
        "/api/conversation",
        {
          searchId,
          conversationId,
          displayedIds: ids,
          focusedId: focused && ids.includes(focused) ? focused : undefined,
          text: value.trim(),
        },
        conversationReplySchema.extend({ conversationId: z.uuid() }),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setConversationId(r.conversationId);
      setAnswer(r.answer);
      onReply(r);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : "Could not answer.");
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section className="chat stack">
      <div className="eyebrow">Conversation</div>
      <p className="small muted">
        Which prospect should I approach first, and why?
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(text);
        }}
      >
        <label>
          Question
          <textarea
            value={text}
            onChange={(e) => {
              cancel();
              setText(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(e.currentTarget.value);
              }
            }}
            maxLength={3000}
          />
        </label>
        <VoiceInput
          autoSubmit
          onTranscript={(value) => {
            setText(value);
            void submit(value);
          }}
        />
        <p className="small muted">
          Speak to send automatically. Type and press Enter to send; Shift+Enter
          adds a line. Editing cancels the pending answer.
        </p>
        {busy ? (
          <button type="button" className="secondary" onClick={cancel}>
            Stop and edit
          </button>
        ) : null}
        {busy ? (
          <p role="status">Thinking… You can edit your question at any time.</p>
        ) : null}
      </form>
      {answer ? (
        <div aria-live="polite">
          <p>{answer}</p>
          <SpeakButton text={answer} />
          <p className="small muted">
            Based on your current shortlist and its evidence; not a fresh web
            search.
          </p>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
