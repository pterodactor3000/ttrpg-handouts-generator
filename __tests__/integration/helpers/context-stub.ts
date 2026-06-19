import { vi } from 'vitest';

interface ContextStubOptions {
  body?: unknown;
  rawBody?: string;
  params?: Record<string, string>;
  method?: string;
  cookieHeader?: string;
}

export function makeContext(options: ContextStubOptions = {}) {
  const { body, rawBody, params = {}, method = 'POST', cookieHeader } = options;

  const headers = new Headers();
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  const requestInit: RequestInit = { method, headers };
  if (rawBody !== undefined) {
    requestInit.body = rawBody;
  } else if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
    headers.set('Content-Type', 'application/json');
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
