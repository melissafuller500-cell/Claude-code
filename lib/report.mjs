export function formatReport({ products, kits, errors, warnings, excludedSamples }, production = process.env.BAYSTOCK_ENV === 'production') {
  const lines = [];
  if (errors.length) {
    lines.push(`Catalog validation failed with ${errors.length} error(s):`);
    for (const e of errors) lines.push(`  ✗ ${e}`);
  } else {
    const samples = products.filter((p) => p.sample).length;
    lines.push(
      `Catalog OK: ${products.length} products, ${kits.length} kits` +
        (production ? ` (production; ${excludedSamples} sample rows excluded)` : ` (${samples} sample rows included)`),
    );
  }
  for (const w of warnings) lines.push(`  ! ${w}`);
  return lines.join('\n');
}
