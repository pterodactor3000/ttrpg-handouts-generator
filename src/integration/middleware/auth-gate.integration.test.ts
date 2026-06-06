import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminClient } from '@/integration/helpers/admin-client';
import { makeMiddlewareContext } from '@/integration/helpers/middleware-context-stub';
import { createTestUser, deleteTestUser, signInAsUser } from '@/integration/helpers/test-users';

// vi.mock replaces createClient so onRequest uses bearer-injected Supabase clients;
// the real cookie-based SSR path in @/lib/supabase is intentionally not exercised here.
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}));

import { createClient as createAppSupabaseClient } from '@/lib/supabase';
import { onRequest } from '@/middleware';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} for integration tests.`);
  }
  return value;
}

let adminClient: ReturnType<typeof createAdminClient>;
let unauthenticatedClient: ReturnType<typeof createClient>;
let authenticatedClient: Awaited<ReturnType<typeof signInAsUser>>;
let testUserId: string;
let testUserEmail: string;

describe('auth gate middleware (integration)', () => {
  beforeAll(async () => {
    adminClient = createAdminClient();
    const password = 'integration-test-password';
    testUserEmail = `auth-gate-${crypto.randomUUID()}@integration.test`;

    const testUser = await createTestUser(adminClient, testUserEmail, password);
    testUserId = testUser.id;

    authenticatedClient = await signInAsUser(testUserEmail, password);

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const anonKey = requireEnv('SUPABASE_ANON_KEY');
    unauthenticatedClient = createClient(supabaseUrl, anonKey);
  });

  afterAll(async () => {
    await deleteTestUser(adminClient, testUserId);
  });

  describe('anonymous access to protected routes', () => {
    beforeEach(() => {
      vi.mocked(createAppSupabaseClient).mockReturnValue(unauthenticatedClient);
    });

    it('GET /dashboard redirects to sign-in', async () => {
      const context = makeMiddlewareContext({ pathname: '/dashboard' });
      const response: Response = await onRequest(context, context.next);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/auth/signin');
      expect(context.next).not.toHaveBeenCalled();
      expect(context.locals.user).toBeNull();
    });

    it('GET /handouts redirects to sign-in', async () => {
      const context = makeMiddlewareContext({ pathname: '/handouts' });
      const response: Response = await onRequest(context, context.next);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/auth/signin');
      expect(context.next).not.toHaveBeenCalled();
      expect(context.locals.user).toBeNull();
    });

    it('GET /handouts/new redirects to sign-in', async () => {
      const context = makeMiddlewareContext({ pathname: '/handouts/new' });
      const response: Response = await onRequest(context, context.next);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/auth/signin');
      expect(context.next).not.toHaveBeenCalled();
      expect(context.locals.user).toBeNull();
    });
  });

  describe('anonymous access to public routes', () => {
    beforeEach(() => {
      vi.mocked(createAppSupabaseClient).mockReturnValue(unauthenticatedClient);
    });

    it('GET / passes through without redirect', async () => {
      const context = makeMiddlewareContext({ pathname: '/' });
      const response = await onRequest(context, context.next);

      expect(context.next).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(context.locals.user).toBeNull();
    });

    it('GET /share/some-uuid passes through without redirect', async () => {
      const context = makeMiddlewareContext({ pathname: '/share/some-uuid' });
      const response = await onRequest(context, context.next);

      expect(context.next).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(context.locals.user).toBeNull();
    });

    it('GET /auth/signin passes through without redirect', async () => {
      const context = makeMiddlewareContext({ pathname: '/auth/signin' });
      const response = await onRequest(context, context.next);

      expect(context.next).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(context.locals.user).toBeNull();
    });
  });

  describe('authenticated access to protected routes', () => {
    beforeEach(() => {
      vi.mocked(createAppSupabaseClient).mockReturnValue(authenticatedClient);
    });

    it('GET /dashboard passes through and populates locals.user', async () => {
      const context = makeMiddlewareContext({ pathname: '/dashboard' });
      const response = await onRequest(context, context.next);

      expect(context.next).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(context.locals.user).not.toBeNull();
      expect(context.locals.user?.id).toBe(testUserId);
      expect(context.locals.user?.email).toBe(testUserEmail);
    });

    it('GET /handouts/new passes through and populates locals.user', async () => {
      const context = makeMiddlewareContext({ pathname: '/handouts/new' });
      const response = await onRequest(context, context.next);

      expect(context.next).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(context.locals.user).not.toBeNull();
      expect(context.locals.user?.id).toBe(testUserId);
      expect(context.locals.user?.email).toBe(testUserEmail);
    });
  });

  describe('authenticated root redirect', () => {
    beforeEach(() => {
      vi.mocked(createAppSupabaseClient).mockReturnValue(authenticatedClient);
    });

    it('GET / redirects to dashboard', async () => {
      const context = makeMiddlewareContext({ pathname: '/' });
      const response: Response = await onRequest(context, context.next);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/dashboard');
      expect(context.next).not.toHaveBeenCalled();
      expect(context.locals.user).not.toBeNull();
      expect(context.locals.user?.id).toBe(testUserId);
      expect(context.locals.user?.email).toBe(testUserEmail);
    });
  });
});
