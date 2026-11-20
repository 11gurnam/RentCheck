import { areaTarget } from "./area-request";
import { withinOneEdit } from "./spelling";

const amount = String.raw`(?:(?:rs\.?|inr)\s*)?([\d,]+(?:\.\d+)?)\s*(k\b|thousand\b|lakhs?\b|lacs?\b)?`;
const upper = String.raw`under|below|up\s*to|at most|max(?:imum)?(?: rent)?|less than|budget(?: of| is)?`;
const lower = String.raw`above|over|at least|min(?:imum)?(?: rent)?|more than`;
const maximum = new RegExp(`\\b(?:${upper})\\s*${amount}`);
const minimum = new RegExp(`\\b(?:${lower})\\s*${amount}`);
const alternative = new RegExp(`^\\s*or\\s+(?:(?:${upper})\\s+)?${amount}`);
const range = new RegExp(`\\bbetween\\s+${amount}\\s*and\\s*${amount}`);
const standalone = new RegExp(`^${amount}\\s*(?:per month|a month)?[.!]?$`);

function rupees(value: string, unit?: string) {
  return Math.round(Number(value.replaceAll(",", "")) * (unit === "k" || unit === "thousand" ? 1000 : unit?.startsWith("lac") || unit?.startsWith("lakh") ? 100000 : 1));
}

export function readBudget(message: string, hasContext: boolean): { min?: number; max?: number } {
  const raw = message.toLowerCase().normalize("NFKC").replace(/₹/g, "rs ")
    .replace(/\b[1-5](?:\.\d+)?\+?\s*(?:stars?|out of 5|\/\s*5)\b/g, " rating ");
  // Correct a comparison word only where it qualifies a number.
  const text = raw.replace(/\b[a-z]{4,7}(?=\s*(?:(?:rs\.?|inr)\s*)?\d)/g, word => {
    const match = ["under", "below", "above"].find(candidate => candidate[0] === word[0] && withinOneEdit(candidate, word));
    return match ?? word;
  });
  const between = text.match(range);
  const upperBound = text.match(maximum);
  const lowerBound = text.match(minimum);
  const budgetOnly = hasContext && text.trim().match(standalone);
  const result: { min?: number; max?: number } = {};
  if (between) {
    result.min = rupees(between[1], between[2] ?? between[4]);
    result.max = rupees(between[3], between[4]);
  }
  if (upperBound) {
    result.max = rupees(upperBound[1], upperBound[2]);
    const also = text.slice((upperBound.index ?? 0) + upperBound[0].length).match(alternative);
    if (also) result.max = Math.max(result.max, rupees(also[1], also[2]));
  } else if (budgetOnly) {
    result.max = rupees(budgetOnly[1], budgetOnly[2]);
  }
  if (lowerBound) result.min = rupees(lowerBound[1], lowerBound[2]);
  const target = areaTarget(text);
  const replacement = target.replacement && /\b(?:budget|rent|maximum|minimum|max|min)\b/.test(text) && target.text.match(standalone);
  if (replacement) {
    const value = rupees(replacement[1], replacement[2]);
    if (/\b(?:minimum|min|lower)\b/.test(text)) result.min = value;
    else result.max = value;
  }
  return result;
}

export function hasBudgetAmount(message: string) {
  return /(?:₹|\b(?:rs\.?|inr)\s*)\s*\d|\b\d+(?:\.\d+)?\s*(?:k|thousand|lakhs?|lacs?|per month)\b/i.test(message) ||
    (/\b(?:rent|budget|rupees)\b/i.test(message) && /\b(?:thousand|lakhs?|lacs?)\b/i.test(message)) ||
    (/\b(?:places|properties|rentals|rooms|rent|budget|monthly)\b/i.test(message) && /\b\d{3,}(?:,\d+)*\s*[.!?]?\s*$|\b\d{1,2}(?:,\d{2,3})+\b/.test(message) &&
      !/\b(?:in|since|built in|unit|flat no|house no|number)\s+\d+[.!?]?\s*$/i.test(message));
}
