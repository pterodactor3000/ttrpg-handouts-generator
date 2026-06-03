import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@/lib/supabase';

// All /handouts/* routes require authentication.
// The public share view lives at /share/[token] — outside this prefix intentionally.
const PROTECTED_ROUTES = ['/dashboard', '/handouts'];

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ?? null;
  } else {
    context.locals.user = null;
  }

  if (context.locals.user && context.url.pathname === '/') {
    return context.redirect('/dashboard');
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect('/auth/signin');
    }
  }

  return next();
});
