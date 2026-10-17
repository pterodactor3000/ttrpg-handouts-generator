import { parseDocumentedExceptionsFromPrBody } from "./parse-documented-exceptions.js";
import {
  type CodeReviewOutput,
  type DocumentedException,
  type NormalizedCodeReviewOutput,
  type PrState,
} from "../schemas/code-review-output.js";

export type NormalizeReviewOutputOptions = {
  prDescription?: string;
};

function mergeDocumentedExceptions(
  fromModel: DocumentedException[],
  fromPrBody: DocumentedException[],
): DocumentedException[] {
  const seen = new Set<string>();
  const merged: DocumentedException[] = [];

  for (const exception of [...fromModel, ...fromPrBody]) {
    const key = `${exception.criterion}::${exception.why}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(exception);
  }

  return merged;
}

function deriveState(
  findingsCount: number,
  acceptanceCriteria: CodeReviewOutput["acceptanceCriteria"],
  documentedExceptions: DocumentedException[],
): PrState {
  const hasFailedAcceptance = acceptanceCriteria.some(
    (criterion) => criterion.status === "not_met",
  );
  const needsFail = findingsCount > 0 || hasFailedAcceptance;

  if (!needsFail) {
    return "pass";
  }

  if (documentedExceptions.length > 0) {
    return "fail_documented_exception";
  }

  return "fail";
}

/**
 * Derive final PR state from findings and acceptance criteria.
 * Model-reported state is replaced — policy default is FAIL until proven PASS.
 */
export function normalizeCodeReviewOutput(
  output: CodeReviewOutput,
  options: NormalizeReviewOutputOptions = {},
): NormalizedCodeReviewOutput {
  const fromPrBody = options.prDescription
    ? parseDocumentedExceptionsFromPrBody(options.prDescription)
    : [];

  const documentedExceptions = mergeDocumentedExceptions(
    output.documentedExceptions,
    fromPrBody,
  );

  const state = deriveState(
    output.findings.length,
    output.acceptanceCriteria,
    documentedExceptions,
  );

  return {
    ...output,
    state,
    documentedExceptions,
    mergeBlocked: state !== "pass",
  };
}
