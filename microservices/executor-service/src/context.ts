import type { IncomingMessage } from 'http';
import { Semaphore } from './infrastructure/docker/concurrency.js';
import { config } from './config/env.js';

export interface ExecutorContext {
  semaphore: Semaphore;
}

const semaphore = new Semaphore(config.maxConcurrentContainers);

export function createRequestContext(_req: IncomingMessage): ExecutorContext {
  return { semaphore };
}
