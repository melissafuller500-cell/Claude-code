// Loaded only when the visitor opens the Parts assistant.
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

interface Msg { role: 'user' | 'assistant'; content: string }
const KEY = 'bs-chat';
const INTRO: Msg = {
  role: 'assistant',
  content: "Hi, I'm the BayStock parts assistant, an AI assistant. I can answer questions about fitment, tier prices, pairs and kits, shipping costs, warranty, and returns, using our catalog. For anything I can't confirm, I'll point you to our team.",
};

/** Turn [text](/path/) links into anchors; everything else stays plain text. */
function renderText(text: string) {
  const parts: (string | preact.JSX.Element)[] = [];
  const re = /\[([^\]]+)\]\((\/[^\s)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    parts.push(text.slice(last, m.index));
    parts.push(<a href={m[2]} class="link font-medium">{m[1]}</a>);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

function Chat({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || 'null') ?? [INTRO];
    } catch {
      return [INTRO];
    }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)));
    } catch { /* ignore */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs]);
  useEffect(() => inputRef.current?.focus(), []);

  const send = async (e: Event) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: 'user' as const, content: text.slice(0, 1000) }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => m !== INTRO).slice(-12), path: location.pathname }),
      });
      const body = await res.json().catch(() => ({}));
      setMsgs([...next, { role: 'assistant', content: body.reply ?? body.error ?? 'Sorry, something went wrong. Please try again.' }]);
    } catch {
      setMsgs([...next, { role: 'assistant', content: 'Network error. Please try again.' }]);
    }
    setBusy(false);
  };

  return (
    <div role="dialog" aria-label="Parts assistant" class="fixed inset-x-2 bottom-[4.5rem] z-[55] flex h-[min(560px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-lg border border-line-200 bg-surface-0 shadow-2xl md:inset-x-auto md:bottom-20 md:right-5 md:w-[380px]">
      <div class="dark-frame flex items-center justify-between bg-ink-900 px-4 py-3 text-white">
        <div>
          <p class="font-display text-xl font-bold leading-none">Parts assistant</p>
          <p class="mt-1 text-[0.75rem] text-on-dark-muted">AI assistant · answers from our catalog</p>
        </div>
        <button type="button" onClick={onClose} class="inline-flex h-10 w-10 items-center justify-center rounded">
          <span class="sr-only">Close chat</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div class="bay-line" aria-hidden="true" />
      <div ref={listRef} class="flex-1 space-y-3 overflow-y-auto bg-surface-50 p-4" aria-live="polite">
        {msgs.map((m) => (
          <div class={m.role === 'user' ? 'ml-8 rounded-lg rounded-br-sm bg-ink-900 px-3.5 py-2.5 text-[0.9375rem] text-white' : 'mr-6 whitespace-pre-line rounded-lg rounded-bl-sm border border-line-200 bg-surface-0 px-3.5 py-2.5 text-[0.9375rem]'}>
            {m.role === 'assistant' ? renderText(m.content) : m.content}
          </div>
        ))}
        {busy && <div class="mr-6 w-16 rounded-lg border border-line-200 bg-surface-0 px-3.5 py-2.5 text-text-600">…</div>}
      </div>
      <form onSubmit={send} class="flex gap-2 border-t border-line-200 p-3">
        <label for="chat-input" class="sr-only">Your question</label>
        <textarea id="chat-input" ref={inputRef} rows={1} maxLength={1000} value={input} placeholder="Ask about a part, price, or fitment"
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
          class="max-h-28 min-h-11 flex-1 resize-none rounded border border-line-200 px-3 py-2.5 text-base" />
        <button type="submit" class="btn btn-primary h-11 px-4" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

export function mountChat(host: HTMLElement, onClose: () => void) {
  render(<Chat onClose={onClose} />, host);
  return () => render(null, host);
}
