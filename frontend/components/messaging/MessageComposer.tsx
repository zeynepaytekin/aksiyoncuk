"use client";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import TextArea from "@/components/ui/TextArea";
import { getMessagingErrorMessage } from "@/services/api/messagingErrorMessage";
import { useMessagingStore } from "@/store/messaging.store";

export default function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent: () => void }) {
  const [draft, setDraft] = useState("");
  const [validation, setValidation] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const send = useMessagingStore((state) => state.sendMessage);
  const status = useMessagingStore((state) => state.sendStatus);
  const error = useMessagingStore((state) => state.sendError);
  const normalized = draft.trim();

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!normalized || normalized.length > 5000) {
      setValidation("Enter a message between 1 and 5000 characters.");
      return;
    }
    setValidation("");
    try {
      await send(conversationId, normalized);
      setDraft("");
      onSent();
      requestAnimationFrame(() => ref.current?.focus());
    } catch { /* Store exposes the structured error. */ }
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }
  const errorText = validation || (error ? getMessagingErrorMessage(error) : "");
  return (
    <form onSubmit={submit} className="border-t border-gray-200 p-4">
      <label htmlFor="message-composer" className="sr-only">Message</label>
      <TextArea ref={ref} id="message-composer" variant="composer" value={draft} maxLength={5000}
        onChange={(event) => { setDraft(event.target.value); setValidation(""); }}
        onKeyDown={keyDown} disabled={status === "loading"} hasError={Boolean(errorText)}
        aria-describedby={errorText ? "message-error" : "message-count"} placeholder="Write a message…" />
      <div className="flex items-center justify-between gap-3">
        <span id="message-count" className={cnCounter(draft.length)}>{draft.length >= 4500 ? `${draft.length}/5000` : ""}</span>
        <Button type="submit" disabled={status === "loading" || !normalized} isLoading={status === "loading"} loadingText="Sending…">Send</Button>
      </div>
      {errorText && <div id="message-error" role="alert" aria-live="assertive" className="mt-2"><FormError message={errorText} /></div>}
    </form>
  );
}
function cnCounter(length: number) {
  return `text-xs ${length > 4900 ? "text-red-600" : "text-gray-500"}`;
}
