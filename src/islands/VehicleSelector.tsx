import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getVehicle, setVehicle } from '../scripts/store';

interface V { make: string; makeSlug: string; model: string; modelSlug: string; years: number[] }
interface Props { vehicles: V[]; variant?: 'dialog' | 'hero' }

/** Three linked dropdowns: year, make, model. Options come from the fitment data. */
export default function VehicleSelector({ vehicles, variant = 'dialog' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const saved = typeof window !== 'undefined' ? getVehicle() : null;
  const [year, setYear] = useState<string>(saved ? String(saved.year) : '');
  const [make, setMake] = useState<string>(saved?.make ?? '');
  const [model, setModel] = useState<string>(saved?.model ?? '');

  const years = useMemo(() => [...new Set(vehicles.flatMap((v) => v.years))].sort((a, b) => b - a), [vehicles]);
  const makes = useMemo(
    () => [...new Set(vehicles.filter((v) => !year || v.years.includes(Number(year))).map((v) => v.make))].sort(),
    [vehicles, year],
  );
  const models = useMemo(
    () => vehicles.filter((v) => v.make === make && (!year || v.years.includes(Number(year)))).map((v) => v.model).sort(),
    [vehicles, year, make],
  );

  useEffect(() => {
    if (make && !makes.includes(make)) setMake('');
  }, [makes]);
  useEffect(() => {
    if (model && !models.includes(model)) setModel('');
  }, [models]);

  useEffect(() => {
    if (variant !== 'dialog') return;
    const open = () => {
      const v = getVehicle();
      if (v) {
        setYear(String(v.year));
        setMake(v.make);
        setModel(v.model);
      }
      dialogRef.current?.showModal();
    };
    window.addEventListener('vehicle:open', open);
    return () => window.removeEventListener('vehicle:open', open);
  }, []);

  const chosen = vehicles.find((v) => v.make === make && v.model === model);
  const ready = !!(year && make && model && chosen);

  const submit = (e: Event) => {
    e.preventDefault();
    if (!ready || !chosen) return;
    setVehicle({ year: Number(year), make, model });
    if (variant === 'hero') {
      window.location.href = `/vehicles/${chosen.makeSlug}/${chosen.modelSlug}/?year=${year}`;
    } else {
      dialogRef.current?.close();
    }
  };

  const selectCls =
    'h-12 w-full appearance-none rounded border border-line-200 bg-surface-0 bg-[length:16px] bg-[right_12px_center] bg-no-repeat pl-3 pr-9 text-base text-text-900 disabled:bg-surface-50 disabled:text-text-600';
  const chevron = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2314181D' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };
  const idp = variant === 'hero' ? 'hero' : 'dlg';

  const form = (
    <form onSubmit={submit} class={variant === 'hero' ? 'grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]' : 'grid gap-4'}>
      <div>
        <label for={`${idp}-year`} class={variant === 'hero' ? 'sr-only' : 'mb-1.5 block text-sm font-medium'}>Year</label>
        <select id={`${idp}-year`} class={selectCls} style={chevron} value={year} onChange={(e) => setYear((e.target as HTMLSelectElement).value)}>
          <option value="">Year</option>
          {years.map((y) => <option value={y}>{y}</option>)}
        </select>
      </div>
      <div>
        <label for={`${idp}-make`} class={variant === 'hero' ? 'sr-only' : 'mb-1.5 block text-sm font-medium'}>Make</label>
        <select id={`${idp}-make`} class={selectCls} style={chevron} value={make} disabled={!makes.length} onChange={(e) => setMake((e.target as HTMLSelectElement).value)}>
          <option value="">Make</option>
          {makes.map((m) => <option value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label for={`${idp}-model`} class={variant === 'hero' ? 'sr-only' : 'mb-1.5 block text-sm font-medium'}>Model</label>
        <select id={`${idp}-model`} class={selectCls} style={chevron} value={model} disabled={!make} onChange={(e) => setModel((e.target as HTMLSelectElement).value)}>
          <option value="">Model</option>
          {models.map((m) => <option value={m}>{m}</option>)}
        </select>
      </div>
      <button type="submit" class="btn btn-primary h-12 w-full sm:w-auto" disabled={!ready}>
        {variant === 'hero' ? 'Show parts' : 'Save vehicle'}
      </button>
    </form>
  );

  if (variant === 'hero') return form;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="vehicle-dialog-title"
      class="vehicle-dialog m-auto w-[min(92vw,440px)] rounded-lg border-0 bg-surface-0 p-0 text-text-900 shadow-2xl backdrop:bg-ink-900/70"
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div class="flex items-center justify-between border-b border-line-200 px-5 py-4">
        <h2 id="vehicle-dialog-title" class="text-2xl">Select your vehicle</h2>
        <button type="button" class="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded" onClick={() => dialogRef.current?.close()}>
          <span class="sr-only">Close</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div class="px-5 py-5">
        <p class="mb-4 text-sm text-text-600">Only vehicles we stock parts for are listed. Your choice is saved in this browser.</p>
        {form}
        {chosen && ready && (
          <a href={`/vehicles/${chosen.makeSlug}/${chosen.modelSlug}/?year=${year}`} class="link mt-4 inline-block text-sm"
            onClick={() => setVehicle({ year: Number(year), make, model })}>
            See every part for the {year} {make} {model}
          </a>
        )}
      </div>
    </dialog>
  );
}
