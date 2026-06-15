import { getExecutorApiServiceHandler } from '@leetcode/executor-server-sdk';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { convertRequest, writeResponse } from '@aws-smithy/server-node';
import { createRequestContext } from './context.js';
import { ExecutorApiServiceImpl } from './application/ExecutorApiServiceImpl.js';
import { config } from './config/env.js';

const service = new ExecutorApiServiceImpl();
const serviceHandler = getExecutorApiServiceHandler(service);

const server = createServer(
  (req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage }) => {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    const httpRequest = convertRequest(req);
    void createRequestContext(req)
      .then((ctx) => serviceHandler.handle(httpRequest, ctx))
      .then((httpResponse) => {
        const response = httpResponse;
        if (response.body === undefined) response.body = '';
        writeResponse(response, res);
      })
      .catch((error: unknown) => {
        console.error('[executor-service] Request handling error', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
  },
);

server.listen(config.port, () => {
  console.log(`[executor-service] Server running on http://localhost:${config.port}`);
  console.log(`  POST http://localhost:${config.port}/v1/execute`);
  console.log(`  GET  http://localhost:${config.port}/healthz`);
});
