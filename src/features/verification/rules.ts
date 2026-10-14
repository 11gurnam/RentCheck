export function womenRecommended(positive: number, eligible: number) {
  return (
    Number.isInteger(positive) &&
    Number.isInteger(eligible) &&
    positive >= 3 &&
    eligible >= positive &&
    positive * 2 > eligible
  );
}
