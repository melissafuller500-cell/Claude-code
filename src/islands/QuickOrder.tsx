import { useEffect, useState } from 'preact/hooks';
import { unitPrice } from '../../lib/pricing.mjs';
import { addToCart, loadCatalogData, usd, type CatalogData } from '../scripts/store';

interface Row { id: number; sku: string; qty: string }
let nextId = 1;
const blank = (): Row => ({ id: nextId++, sku: '', qty: '1' });

/** Parse pasted lines like "BS-CAF-0012, 10", "BS-CAF-0012 10", or "BS-CAF-0012<TAB>10". */
export function parseLines(text: string): { sku: string; qty: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([A-Za-z0-9-]+)[\s,;:\t]*(\d*)/);
      return { sku: (m?.[1] ?? l).toUpperCase(), qty: m?.[2] || '1' };
    });
}

export default function QuickOrder() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 5 }, blank));
  const [paste, setPaste] = useState('');
  const [report, setReport] = useState<{ added: number; failed: { sku: string; reason: string }[] } | null>(null);

  useEffect(() => {
    loadCatalogData().then(setData).catch(() => {});
  }, []);

  const check = (r: Row) => {
    const sku = r.sku.trim().toUpperCase();
    if (!sku) return { state: 'empty' as const };
    const qty = Number(r.qty);
    const item = data?.items[sku];
    if (!data) return { state: 'loading' as const };
    if (!item) return { state: 'error' as const, reason: 'SKU not found' };
    if (!Number.isInteger(qty) || qty < 1 || qty > 9999) return { state: 'error' as const, reason: 'Quantity must be 1 to 9999', item };
    if (!item.inStock) return { state: 'error' as const, reason: 'Out of stock', item };
    return { state: 'ok' as const, item, qty, unit: unitPrice(item.prices, qty) };
  };

  const update = (id: number, patch: Partial<Row>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const applyPaste = () => {
    const parsed = parseLines(paste);
    if (!parsed.length) return;
    const filled = rows.filter((r) => r.sku.trim());
    setRows([...filled, ...parsed.map((p) => ({ id: nextId++, ...p })), blank()]);
    setPaste('');
  };

  const addAll = () => {
    let added = 0;
    const failed: { sku: string; reason: string }[] = [];
    for (const r of rows) {
      const c = check(r);
      if (c.state === 'empty') continue;
      if (c.state === 'ok') {
        addToCart(c.item.sku, c.qty);
        added++;
      } else if (c.state === 'error') failed.push({ sku: r.sku.trim().toUpperCase(), reason: c.reason });
    }
    setReport({ added, failed });
    if (added) setRows([...rows.filter((r) => check(r).state === 'error'), blank(), blank()]);
  };

  const validCount = rows.filter((r) => check(r).state === 'ok').length;

  return (
    <div class="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <div>
        <div class="overflow-x-auto rounded-md border border-line-200 bg-surface-0">
          <table class="w-full min-w-[560px] text-sm">
            <caption class="sr-only">Quick order lines</caption>
            <thead class="bg-surface-50 text-left text-text-600">
              <tr>
                <th scope="col" class="w-44 px-3 py-2.5 font-medium">SKU</th>
                <th scope="col" class="w-24 px-3 py-2.5 font-medium">Quantity</th>
                <th scope="col" class="px-3 py-2.5 font-medium">Product</th>
                <th scope="col" class="w-28 px-3 py-2.5 text-right font-medium">Unit price</th>
                <th scope="col" class="w-10 px-2 py-2.5"><span class="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line-200">
              {rows.map((r, i) => {
                const c = check(r);
                return (
                  <tr>
                    <td class="px-3 py-2">
                      <input aria-label={`SKU, line ${i + 1}`} value={r.sku} placeholder="BS-CAF-0012" spellcheck={false}
                        onInput={(e) => update(r.id, { sku: (e.target as HTMLInputElement).value })}
                        class={`tag-mono h-10 w-full rounded border px-2 uppercase ${c.state === 'error' && c.reason === 'SKU not found' ? 'border-alert-red' : 'border-line-200'}`} />
                    </td>
                    <td class="px-3 py-2">
                      <input aria-label={`Quantity, line ${i + 1}`} value={r.qty} inputMode="numeric"
                        onInput={(e) => update(r.id, { qty: (e.target as HTMLInputElement).value })}
                        class="tag-mono h-10 w-full rounded border border-line-200 px-2 text-center" />
                    </td>
                    <td class="px-3 py-2" aria-live="polite">
                      {c.state === 'ok' && (
                        <span>
                          <a href={c.item.url} class="font-medium no-underline hover:underline">{c.item.name}</a>
                          <span class="block text-[0.8125rem] text-text-600">{c.item.fitmentLine}{c.item.label ? ` · ${c.item.label}` : ''}</span>
                        </span>
                      )}
                      {c.state === 'error' && <span class="font-medium text-alert-red">{c.reason}{c.item ? ` — ${c.item.name}` : ''}</span>}
                      {c.state === 'loading' && <span class="text-text-600">Checking…</span>}
                    </td>
                    <td class="tag-mono px-3 py-2 text-right">{c.state === 'ok' ? usd(c.unit) : ''}</td>
                    <td class="px-2 py-2 text-center">
                      {r.sku && (
                        <button type="button" class="h-8 w-8 rounded text-text-600 hover:bg-surface-50" aria-label={`Remove line ${i + 1}`}
                          onClick={() => setRows(rows.length > 1 ? rows.filter((x) => x.id !== r.id) : [blank()])}>×</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" class="btn border border-line-200 bg-surface-0" onClick={() => setRows([...rows, blank(), blank(), blank()])}>Add more lines</button>
          <button type="button" class="btn btn-primary" disabled={!validCount} onClick={addAll}>Add all to cart{validCount ? ` (${validCount})` : ''}</button>
        </div>
        {report && (
          <div class="mt-4 rounded-md border border-line-200 bg-surface-0 p-4 text-sm" role="status">
            <p class="font-semibold text-ok-green">{report.added} product{report.added === 1 ? '' : 's'} added to cart. {report.added > 0 && <a href="/cart/" class="link ml-1">View cart</a>}</p>
            {report.failed.length > 0 && (
              <>
                <p class="mt-2 font-semibold text-alert-red">{report.failed.length} line{report.failed.length === 1 ? '' : 's'} could not be added:</p>
                <ul class="mt-1 list-disc pl-5">
                  {report.failed.map((f) => <li><span class="tag-mono">{f.sku}</span>: {f.reason}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
      <div class="rounded-md border border-line-200 bg-surface-0 p-5">
        <label for="qo-paste" class="text-xl font-display font-bold">Paste a list</label>
        <p class="mt-1 text-sm text-text-600">One line per part: SKU, then quantity. Commas, spaces, or tabs all work, so you can paste straight from a spreadsheet.</p>
        <textarea id="qo-paste" rows={9} value={paste} onInput={(e) => setPaste((e.target as HTMLTextAreaElement).value)}
          placeholder={'BS-CAF-0012, 10\nBS-IGC-0101, 4\nBS-SUS-0301, 2'}
          class="tag-mono mt-3 w-full rounded border border-line-200 p-3 text-sm" />
        <button type="button" class="btn mt-3 w-full border border-text-900 bg-surface-0" disabled={!paste.trim()} onClick={applyPaste}>Check these lines</button>
      </div>
    </div>
  );
}
