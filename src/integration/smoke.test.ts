import { describe, expect, it } from 'vitest';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { createTestUser, deleteTestUser } from '@/integration/helpers/test-users';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('integration harness smoke', () => {
  it('connects to local Supabase and can create/delete a test user', async () => {
    const adminClient = createAdminClient();
    const email = `smoke-${crypto.randomUUID()}@integration.test`;
    const password = 'integration-test-password';

    const { id } = await createTestUser(adminClient, email, password);
    expect(id).toMatch(uuidPattern);

    await deleteTestUser(adminClient, id);
  });
});
