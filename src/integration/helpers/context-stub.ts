import { vi } from 'vitest';

interface ContextStubOptions {
  body?: unknown;
  rawBody?: string;
  params?: Record<string, string>;
  method?: string;
}

export function makeContext(options: ContextStubOptions = {}) {
  const { body, rawBody, params = {}, method = 'POST' } = options;

  const requestInit: RequestInit = { method };
  if (rawBody !== undefined) {
    requestInit.body = rawBody;
  } else if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
    requestInit.headers = { 'Content-Type': 'application/json' };
  }

  const request = new Request('http://localhost/api/test', requestInit);

  const cookies = {
    set: vi.fn(),
    get: vi.fn(),
  };

  return {
    request,
    cookies,
    params,
  };
}
