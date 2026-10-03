/** Formules du calculateur, partagées entre le rendu au build et le script du navigateur. */
export type CalcInput = { bill: number; real: number; term: number; rate: number; days: number };
export const CALC_DEFAULTS: CalcInput = { bill: 10_000_000, real: 60, term: 30, rate: 14, days: 15 };

export function compute(c: CalcInput) {
  const perDay = c.bill / 30;
  const late = Math.max(0, c.real - c.term);
  const days = Math.min(c.days, Math.max(0, c.real));
  return {
    locked: perDay * c.real,
    lateAmount: perDay * late,
    freed: perDay * days,
    yearlyCost: (perDay * late * c.rate) / 100,
    absorbed: late > 0 ? Math.min(1, days / late) : 1,
    projected: Math.max(c.term, c.real - days),
    late,
    days,
  };
}
