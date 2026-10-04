import { useEffect, useState } from 'preact/hooks';
import SearchBox, { loadIndex, searchIndex } from './SearchBox';

type Entry = Awaited<ReturnType<typeof loadIndex>>[number];

export default function SearchResults() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Entry[] | null>(null);
  useEffect(() => {
    const query = new URLSearchParams(location.search).get('q') ?? '';
    setQ(query);
    if (query.trim().length >= 2) loadIndex().then((idx) => setResults(searchIndex(idx, query.trim(), 100)));
    else setResults([]);
  }, []);
  return (
    <div>
      <div class="max-w-2xl"><SearchBox id="search-page" placeholder="Part name, SKU, OE number, or vehicle" variant="light" initial={q} key={q} /></div>
      {results && q && (
        <p class="mt-6 text-text-600">{results.length} result{results.length === 1 ? '' : 's'} for “{q}”</p>
      )}
      {results && results.length > 0 && (
        <ul class="mt-4 divide-y divide-line-200 rounded-md border border-line-200 bg-surface-0">
          {results.map((r) => (
            <li>
              <a href={r.u} class="flex items-center gap-4 px-5 py-4 no-underline hover:bg-surface-50">
                <span class="min-w-0 flex-1">
                  <span class="tag-mono block text-[0.75rem] text-text-600">{r.s}</span>
                  <span class="block font-semibold">{r.n}</span>
                  <span class="block text-sm text-text-600">{r.f}</span>
                </span>
                <span class="tag-mono">${r.p.toFixed(2)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {results && q && results.length === 0 && (
        <p class="mt-4 rounded-md border border-dashed border-line-200 bg-surface-0 p-6">No parts match. Try a SKU, an original part number, or a vehicle, or <a href="/contact/" class="link">ask us</a>.</p>
      )}
    </div>
  );
}
