import type { IncomingMessage } from 'http';
import { Semaphore } from './infrastructure/docker/concurrency.js';
import { config } from './config/env.js';
import type { AuthPrincipal } from './auth/principal.js';
import { extractPrincipal } from './auth/principal.js';

export interface ExecutorContext {
  semaphore: Semaphore;
  principal: AuthPrincipal | null;
}

const semaphore = new Semaphore(config.maxConcurrentContainers);

export function createRequestContext(req: IncomingMessage): ExecutorContext {
  return {
    semaphore,
    principal: extractPrincipal(req),
  };
}
