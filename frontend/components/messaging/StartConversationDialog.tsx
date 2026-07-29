"use client";
import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { getMessagingErrorMessage } from "@/services/api/messagingErrorMessage";
import { useMessagingStore } from "@/store/messaging.store";

export default function StartConversationDialog({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: (id: string) => void }) {
  const [username, setUsername] = useState("");
  const [validation, setValidation] = useState("");
  const start = useMessagingStore((state) => state.startConversation);
  const status = useMessagingStore((state) => state.startStatus);
  const error = useMessagingStore((state) => state.startError);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim()) { setValidation("Enter a username."); return; }
    setValidation("");
    try {
      const conversation = await start(username);
      setUsername("");
      onClose();
      onStarted(conversation.id);
    } catch { /* Store exposes the structured error. */ }
  }
  return (
    <Modal isOpen={open} onClose={onClose} title="New message" description="Start or reopen a direct conversation.">
      <form onSubmit={submit}>
        <label htmlFor="conversation-username" className="mb-1 block text-sm font-medium text-gray-700">Username</label>
        <Input id="conversation-username" value={username} onChange={(event) => { setUsername(event.target.value); setValidation(""); }}
          disabled={status === "loading"} aria-invalid={Boolean(validation || error) || undefined} autoComplete="off" />
        {(validation || error) && <div className="mt-2" role="alert"><FormError message={validation || (error ? getMessagingErrorMessage(error) : "")} /></div>}
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={status === "loading"} disabled={status === "loading"} loadingText="Starting…">Start conversation</Button>
        </div>
      </form>
    </Modal>
  );
}
