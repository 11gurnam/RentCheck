export function reviewPage(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const n = Number(value);
  return Number.isSafeInteger(n) ? Math.min(10000, Math.max(1, n)) : 1;
}
