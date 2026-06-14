import { getContestsApiServiceHandler } from '@leetcode/contests-server-sdk';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { convertRequest, writeResponse } from '@aws-smithy/server-node';
import { createRequestContext } from './context.js';
import { ContestsApiServiceImpl } from './application/ContestsApiServiceImpl.js';

const rawPort = process.env['PORT'];
const PORT = rawPort ? parseInt(rawPort, 10) : 3005;

const service = new ContestsApiServiceImpl();
const serviceHandler = getContestsApiServiceHandler(service);

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
        console.error('[contests-service] Request handling error', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
  },
);

server.listen(PORT, () => {
  console.log(`[contests-service] Server running on http://localhost:${PORT}`);
  console.log(`[contests-service] Endpoints disponibles:`);
  console.log(`  GET    http://localhost:${PORT}/v1/contests`);
  console.log(`  GET    http://localhost:${PORT}/v1/contests/{contestId}`);
  console.log(`  POST   http://localhost:${PORT}/v1/contests`);
  console.log(`  PATCH  http://localhost:${PORT}/v1/contests/{contestId}`);
  console.log(`  DELETE http://localhost:${PORT}/v1/contests/{contestId}`);
  console.log(`  POST   http://localhost:${PORT}/v1/contests/{contestId}/enroll`);
  console.log(`  DELETE http://localhost:${PORT}/v1/contests/{contestId}/enroll`);
  console.log(`  GET    http://localhost:${PORT}/v1/contests/{contestId}/problems`);
  console.log(`  GET    http://localhost:${PORT}/v1/contests/{contestId}/leaderboard`);
});
