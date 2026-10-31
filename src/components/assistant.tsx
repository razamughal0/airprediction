"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Bot, LoaderCircle, MessageCircle, Sparkles, X } from "lucide-react";
import { authHeaders } from "./ui";

type Message = { role: "user" | "assistant"; content: string; mode?: "provider" | "local"; notice?: string };
type Reply = { reply: string; mode: "provider" | "local"; model?: string; notice?: string; error?: string };

const SUGGESTIONS = [
  "Who needs attention this week?",
  "Explain M. Raza Mughal's risk",
  "Show Abdul Hadi's BSAI standing",
  "How does the what-if explorer work?",
];
const GREETING =
  "Hi — I'm the AIR University Advisory Assistant. I can explain student risk signals, summarize subject performance, and suggest academic support steps based on records in your scope.";

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"provider" | "local" | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history = [...messages, { role: "user" as const, content: question }];
    setMessages(history);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      const data = (await response.json()) as Reply;
      if (!response.ok) throw new Error(data.error || "The assistant is unavailable right now.");
      setMode(data.mode);
      setMessages((current) => [...current, { role: "assistant", content: data.reply, mode: data.mode, notice: data.notice }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            (error as Error).message ||
            "I couldn't reach the assistant. Check that the server is running and DATABASE_URL is configured, then try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <>
      {!open && (
        <button className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Open Uplift assistant">
          <MessageCircle size={21} />
          <span>Ask AIR</span>
        </button>
      )}
      {open && (
        <section className="assistant-panel" role="dialog" aria-modal="false" aria-label="Uplift assistant">
          <header className="assistant-header">
            <span className="assistant-avatar">
              <Bot size={18} />
            </span>
            <div>
              <h2>AIR Advisory Assistant</h2>
              <p>
                <i className={mode === "provider" ? "live" : ""} />
                {mode === "provider" ? "Connected to AI provider" : "Air University Academic Guidance"}
              </p>
            </div>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X size={18} />
            </button>
          </header>
          <div className="assistant-messages" ref={listRef} aria-live="polite">
            {messages.map((message, index) => (
              <article key={index} className={`assistant-message ${message.role}`}>
                {message.role === "assistant" && (
                  <span className="assistant-mini">
                    <Sparkles size={12} />
                  </span>
                )}
                <div>
                  {message.content.split("\n").map((line, lineIndex) => (line ? <p key={lineIndex}>{line}</p> : <br key={lineIndex} />))}
                  {message.notice && <small className="assistant-notice">{message.notice}</small>}
                </div>
              </article>
            ))}
            {busy && (
              <article className="assistant-message">
                <span className="assistant-mini">
                  <Sparkles size={12} />
                </span>
                <div className="assistant-typing">
                  <LoaderCircle size={13} className="spin" />
                  Checking Air University records…
                </div>
              </article>
            )}
          </div>
          {messages.length <= 1 && (
            <div className="assistant-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} onClick={() => void send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <form className="assistant-input" onSubmit={submit}>
            <label className="sr-only" htmlFor="assistant-question">
              Ask the Uplift assistant
            </label>
            <textarea
              id="assistant-question"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Ask about Abdul Hadi, M. Raza Mughal, BSAI subjects, or next steps…"
            />
            <button type="submit" className="assistant-send" disabled={busy || !input.trim()} aria-label="Send question">
              {busy ? <LoaderCircle size={16} className="spin" /> : <ArrowUp size={17} />}
            </button>
          </form>
          <p className="assistant-foot">Air University Student Advisory &amp; Early-Warning System</p>
        </section>
      )}
    </>
  );
}
