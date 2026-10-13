import { describe, expect, it } from "vitest";
import { reviewLanguage } from "./language";
describe("review language", () => {
  it("leaves clean feedback, numbers, whitespace and criticism unchanged", () => {
    for (const body of ["The water was unavailable for 3 days. Rent was ₹12,000.", "The landlord was dishonest and the room was dirty.", "The classic flat had a basement.\nNo issues."]) expect(reviewLanguage(body).suggestion).toBe(body);
  });
  it("keeps concrete complaints and negation while removing profanity", () => {
    expect(reviewLanguage("The fucking water supply was shitty for 3 days.").suggestion).toBe("The water supply was poor for 3 days.");
    expect(reviewLanguage("The room was not shitty.").suggestion).toBe("The room was not poor.");
    expect(reviewLanguage("The landlord is an idiot. The power failed twice.").suggestion).toBe("The landlord is someone I found difficult to deal with. The power failed twice.");
  });
  it("handles common masked profanity and Hindi transliteration", () => {
    expect(reviewLanguage("The f**king service was sh*t.").suggestion).toBe("The service was unacceptable.");
    expect(reviewLanguage("The service was bakwaas.").suggestion).toBe("The service was disappointing.");
  });
  it("requires manual editing for unsafe or ambiguous wording", () => {
    expect(reviewLanguage("I will kill you.").manualEdit).toBe(true);
    expect(reviewLanguage("The manager is a bitch.").manualEdit).toBe(true);
  });
  it("suggestions can pass the same server check after approval", () => {
    expect(reviewLanguage(reviewLanguage("The fucking service was shitty.").suggestion).flagged).toBe(false);
  });
});
