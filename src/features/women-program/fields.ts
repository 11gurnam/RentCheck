export const genderOptions = [
  ["woman", "Woman"], ["man", "Man"], ["non_binary", "Non-binary"],
  ["prefer_not", "Prefer not to say"], ["self_described", "Self-describe"],
] as const;

export const ratingFields = [
  ["neighbourhood", "Neighbourhood safety"],
  ["security", "Building security"],
  ["landlord", "Landlord behaviour and responsiveness"],
  ["privacy", "Privacy and personal space"],
  ["conditions", "Maintenance and living conditions"],
  ["fair_treatment", "Freedom from harassment or discrimination"],
  ["overall", "Overall living experience"],
  ["recommendation", "How strongly would you recommend living here?"],
] as const;

export type RatingKey = (typeof ratingFields)[number][0];
export const optionalRating = (key: RatingKey) => ["landlord", "neighbourhood", "security"].includes(key);
export type ProgramPreferences = {
  gender: (typeof genderOptions)[number][0] | null;
  description: string | null;
  tenancy: "current" | "former" | "none" | null;
  opted_in: boolean;
  feedback: { ratings: Partial<Record<RatingKey, number | null>>; comment: string | null } | null;
};
