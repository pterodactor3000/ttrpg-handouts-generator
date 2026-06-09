import { vi } from 'vitest';

interface MiddlewareContextOptions {
  pathname: string;
  requestInit?: RequestInit;
}

export function makeMiddlewareContext(options: MiddlewareContextOptions) {
  const { pathname, requestInit } = options;
  const url = new URL(`http://localhost${pathname}`);
  const request = new Request(url.toString(), requestInit);

  const locals: App.Locals = { user: null };

  const cookies = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  const redirect = (path: string) => new Response(null, { status: 302, headers: { Location: path } });

  const next = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

  return {
    url,
    locals,
    request,
    cookies,
    redirect,
    next,
  };
}
