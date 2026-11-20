import "server-only";

export async function structuredAssistantResponse(instructions: string[], input: unknown, responseSchema: object): Promise<unknown> {
  const provider = process.env.RENTCHECK_ASSISTANT_PROVIDER ?? "gemini";
  const key = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.RENTCHECK_ASSISTANT_MODEL?.trim() || "gemini-3.5-flash-lite";
  if (provider !== "gemini" || !key || !/^[a-z0-9.-]+$/.test(model)) return null;

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(13000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions.join(" ") }] },
        contents: [{ parts: [{ text: JSON.stringify(input) }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 900, responseMimeType: "application/json", responseSchema },
      }),
    });
    if (!response.ok) return null;
    const envelope = await response.json();
    const content = envelope.candidates?.[0]?.content?.parts?.filter((part: { thought?: boolean }) => !part.thought)
      .map((part: { text?: string }) => part.text ?? "").join("") ?? "";
    return JSON.parse(content);
  } catch {
    return null;
  }
}
