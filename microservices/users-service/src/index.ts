import { getUsersApiServiceHandler } from '@leetcode/users-server-sdk';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { convertRequest, writeResponse } from '@aws-smithy/server-node';
import { createRequestContext } from './context.js';
import { UsersApiServiceImpl } from './application/UsersApiServiceImpl.js';

const rawPort = process.env['PORT'];
const PORT = rawPort ? parseInt(rawPort, 10) : 3004;

const service = new UsersApiServiceImpl();
const serviceHandler = getUsersApiServiceHandler(service);

const server = createServer(
  (req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage }) => {
    const httpRequest = convertRequest(req);
    const ctx = createRequestContext(req);

    void serviceHandler
      .handle(httpRequest, ctx)
      .then((httpResponse) => {
        const response = httpResponse;

        if (response.body === undefined) {
          response.body = '';
        }

        writeResponse(response, res);
      })
      .catch((error: unknown) => {
        console.error('[users-service] Request handling error', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
  },
);

server.listen(PORT, () => {
  console.log(`[users-service] Server running on http://localhost:${PORT}`);
  console.log(`[users-service] Endpoints disponibles:`);
  console.log(`  GET  http://localhost:${PORT}/v1/users/me`);
  console.log(`  GET  http://localhost:${PORT}/v1/users/me/problem-statuses`);
  console.log(`  GET  http://localhost:${PORT}/v1/users/{userId}`);
});
