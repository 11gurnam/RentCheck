export function withinOneEdit(actual: string, typed: string) {
  if (Math.abs(actual.length - typed.length) > 1) return false;
  const [short, long] = actual.length <= typed.length ? [actual, typed] : [typed, actual];
  let offset = 0;
  while (offset < short.length && short[offset] === long[offset]) offset++;
  if (short.length !== long.length) return short.slice(offset) === long.slice(offset + 1);
  return short.slice(offset + 1) === long.slice(offset + 1) ||
    (short[offset] === long[offset + 1] && short[offset + 1] === long[offset] && short.slice(offset + 2) === long.slice(offset + 2));
}
