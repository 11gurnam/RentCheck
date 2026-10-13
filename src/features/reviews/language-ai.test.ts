import { describe, expect, it, vi } from "vitest";
import { analyseReview } from "./language-ai";
const reply = (value: unknown) => vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] }), { status: 200 }));
describe("AI review language checks", () => {
  it("rewrites whole non-English reviews and preserves numbers", async () => {
    const fetcher = reply({offensive:true,rephrased:"मुझे सेवा से बहुत निराशा हुई। पानी 3 दिन नहीं आया।",needsManualEdit:false});
    const result = await analyseReview("सेवा घटिया थी। पानी 3 दिन नहीं आया।", "test-key", fetcher);
    expect(result.source).toBe("ai");expect(result.flagged).toBe(true);expect(result.suggestion).toContain("3 दिन");
    const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(request.systemInstruction.parts[0].text).toContain("SAME language");
  });
  it("ignores AI edits to clean text", async () => {
    const text="  Le logement était propre.\nMerci.";
    expect((await analyseReview(text,"key",reply({offensive:false,rephrased:"Changed",needsManualEdit:false}))).suggestion).toBe(text);
  });
  it("requires editing if AI alters numerical facts", async () => {
    const result=await analyseReview("The shitty water failed for 3 days.","key",reply({offensive:true,rephrased:"The water failed for 4 days.",needsManualEdit:false}));
    expect(result.manualEdit).toBe(true);expect(result.suggestion).toBe(result.original);
  });
  it("handles missing keys, outages and invalid responses honestly", async () => {
    expect((await analyseReview("The service was shitty.","")).notice).toContain("not configured");
    const offline=vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    expect((await analyseReview("A clean and quiet room.","key",offline)).source).toBe("local");
    expect((await analyseReview("A clean and quiet room.","key",reply({unexpected:true}))).notice).toContain("unavailable");
  });
});
