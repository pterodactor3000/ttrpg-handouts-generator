import { expect } from 'vitest';

const schemaLeakageTerms = [
  'handouts',
  'gm_id',
  'share_token',
  'markdown_content',
  'background_category',
  'published_at',
  'archived_at',
  'postgres',
  'pgerror',
  'PostgREST',
  'relation',
  'constraint',
] as const;

export function assertNoSchemaLeakage(body: string): void {
  for (const term of schemaLeakageTerms) {
    expect(body).not.toContain(term);
  }
}
