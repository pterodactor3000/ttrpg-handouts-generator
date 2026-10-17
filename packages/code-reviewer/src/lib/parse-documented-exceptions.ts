import {
  documentedExceptionSchema,
  type DocumentedException,
} from "../schemas/code-review-output.js";

/**
 * Extract structured exception entries from a PR description's
 * "## Acceptance exceptions" section (code-review-policy.md).
 */
export function parseDocumentedExceptionsFromPrBody(
  prBody: string,
): DocumentedException[] {
  const sectionMatch = prBody.match(
    /##\s*Acceptance exceptions\s*\n([\s\S]*?)(?=\n##\s|\s*$)/i,
  );
  if (!sectionMatch?.[1]) {
    return [];
  }

  const section = sectionMatch[1].trim();
  const exceptions: DocumentedException[] = [];

  const blocks = section.split(/\n(?=###\s+)/).filter(Boolean);

  for (const block of blocks) {
    const criterionFromBullet = extractBulletField(block, "Criterion");
    const headingMatch = block.match(/^#{1,6}\s+(.+?)\s*$/m);
    const criterion =
      criterionFromBullet ??
      headingMatch?.[1]?.trim().replace(/^#+\s*/, "") ??
      undefined;

    if (!criterion) {
      continue;
    }

    const why = extractBulletField(block, "Why");
    const riskMitigation = extractBulletField(block, "Risk mitigation");
    const followUp = extractBulletField(block, "Follow-up");

    if (!why || !riskMitigation || !followUp) {
      continue;
    }

    const parsed = documentedExceptionSchema.safeParse({
      criterion,
      why,
      riskMitigation,
      followUp,
    });

    if (parsed.success) {
      exceptions.push(parsed.data);
    }
  }

  return exceptions;
}

function extractBulletField(block: string, label: string): string | undefined {
  const match = block.match(
    new RegExp(`-\\s*\\*\\*${label}:\\*\\*\\s*(.+?)(?=\\n-|\\s*$)`, "is"),
  );
  return match?.[1]?.trim();
}
