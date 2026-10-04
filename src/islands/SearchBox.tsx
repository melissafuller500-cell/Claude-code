import { useEffect, useRef, useState } from 'preact/hooks';

interface Entry { s: string; n: string; u: string; f: string; o: string; v: string; c: string; p: number }
interface Props { id: string; placeholder: string; variant?: 'dark' | 'light'; autofocus?: boolean; initial?: string }

let indexPromise: Promise<Entry[]> | null = null;
export const loadIndex = () => (indexPromise ??= fetch('/data/search.json').then((r) => r.json()));

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Matches product name, SKU, original part numbers, and vehicle. */
export function searchIndex(index: Entry[], query: string, limit = 8): Entry[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const scored: { e: Entry; score: number }[] = [];
  for (const e of index) {
    const hay = `${e.n} ${e.s} ${e.o} ${e.v} ${e.c}`.toLowerCase();
    const hayC = compact(hay);
    let score = 0;
    let all = true;
    for (const t of tokens) {
      const tc = compact(t);
      if (hay.includes(t)) score += 2;
      else if (tc && hayC.includes(tc)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (!all) continue;
    const q = compact(query);
    if (compact(e.s) === q) score += 20;
    if (e.o && e.o.split(' ').some((o) => compact(o) === q)) score += 15;
    if (e.n.toLowerCase().startsWith(tokens[0])) score += 3;
    scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.e);
}

export default function SearchBox({ id, placeholder, variant = 'dark', autofocus, initial = '' }: Props) {
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [index, setIndex] = useState<Entry[] | null>(null);
  const wrap = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (q.trim().length < 2 || !index) {
      setResults([]);
      return;
    }
    setResults(searchIndex(index, q.trim()));
    setActive(-1);
  }, [q, index]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const ensureIndex = () => {
    if (!index) loadIndex().then(setIndex).catch(() => {});
  };

  const onKey = (e: KeyboardEvent) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      window.location.href = results[active].u;
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const dark = variant === 'dark';
  const listId = `${id}-results`;
  const showList = open && q.trim().length >= 2;

  return (
    <form ref={wrap} role="search" action="/search/" method="get" class="relative w-full"
      onSubmit={(e) => {
        if (q.trim().length < 2) e.preventDefault();
      }}>
      <label for={id} class="sr-only">Search parts by name, SKU, original part number, or vehicle</label>
      <svg class={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? 'text-on-dark-muted' : 'text-text-600'}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        id={id}
        name="q"
        type="search"
        autocomplete="off"
        autofocus={autofocus}
        placeholder={placeholder}
        value={q}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onFocus={() => {
          ensureIndex();
          setOpen(true);
        }}
        onInput={(e) => {
          ensureIndex();
          setQ((e.target as HTMLInputElement).value);
          setOpen(true);
        }}
        onKeyDown={onKey}
        class={dark
          ? 'h-11 w-full rounded border border-steel-500/70 bg-ink-700 pl-10 pr-3 text-base text-white placeholder:text-on-dark-muted focus:border-line-yellow md:text-[0.9375rem]'
          : 'h-14 w-full rounded border border-line-200 bg-surface-0 pl-11 pr-4 text-base text-text-900'}
      />
      {showList && (
        <div id={listId} role="listbox" class="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-auto rounded-md border border-line-200 bg-surface-0 text-text-900 shadow-2xl">
          {!index && <p class="px-4 py-3 text-sm text-text-600">Loading…</p>}
          {index && !results.length && <p class="px-4 py-3 text-sm text-text-600">No parts match “{q}”. Try a SKU, an original part number, or a vehicle.</p>}
          {results.map((r, i) => (
            <a id={`${listId}-${i}`} role="option" aria-selected={i === active} href={r.u}
              class={`flex items-start gap-3 border-b border-line-200 px-4 py-3 no-underline last:border-0 ${i === active ? 'bg-surface-50' : 'hover:bg-surface-50'}`}>
              <span class="min-w-0 flex-1">
                <span class="tag-mono block text-[0.75rem] text-text-600">{r.s}</span>
                <span class="block text-[0.9375rem] font-semibold leading-snug">{r.n}</span>
                <span class="block text-[0.8125rem] text-text-600">{r.f}</span>
              </span>
              <span class="tag-mono shrink-0 text-sm">${r.p.toFixed(2)}</span>
            </a>
          ))}
          {index && results.length > 0 && (
            <button type="submit" class="block w-full bg-surface-50 px-4 py-2.5 text-left text-sm font-medium text-link-blue">See all results for “{q}”</button>
          )}
        </div>
      )}
    </form>
  );
}
