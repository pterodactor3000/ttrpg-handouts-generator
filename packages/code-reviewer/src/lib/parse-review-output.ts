export function parseJsonFromAgentText(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to fenced-block extraction.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1].trim());
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return JSON.parse(objectMatch[0]);
  }

  throw new Error("Agent response did not contain valid JSON.");
}
