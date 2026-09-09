import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  mandateJson?: string | undefined;
};

const storage = new AsyncLocalStorage<RequestContext>();

export const requestCtx = {
  run<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
    return storage.run(ctx, fn);
  },
  get(): RequestContext {
    return storage.getStore() ?? {};
  },
};
