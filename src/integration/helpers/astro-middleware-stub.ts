export function defineMiddleware<T extends (...handlerArguments: unknown[]) => unknown>(handler: T): T {
  return handler;
}
