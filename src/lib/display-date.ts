export function displayDate(value: string) {
  const date = new Date(value.length === 10 ? value + "T00:00:00Z" : value);
  return Number.isNaN(date.getTime()) ? "N/A" : new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(date);
}
