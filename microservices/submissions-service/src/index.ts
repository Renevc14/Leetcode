import { getSubmissionsApiServiceHandler } from '@leetcode/submissions-server-sdk';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { convertRequest, writeResponse } from '@aws-smithy/server-node';
import { createRequestContext } from './context.js';
import { SubmissionsApiServiceImpl } from './application/SubmissionsApiServiceImpl.js';

const rawPort = process.env['PORT'];
const PORT = rawPort ? parseInt(rawPort, 10) : 3003;

const service = new SubmissionsApiServiceImpl();
const serviceHandler = getSubmissionsApiServiceHandler(service);

const server = createServer(
  (req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage }) => {
    const httpRequest = convertRequest(req);
    void createRequestContext(req)
      .then((ctx) => serviceHandler.handle(httpRequest, ctx))
      .then((httpResponse) => {
        const response = httpResponse;

        if (response.body === undefined) {
          response.body = '';
        }

        writeResponse(response, res);
      })
      .catch((error: unknown) => {
        console.error('[submissions-service] Request handling error', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
  },
);

server.listen(PORT, () => {
  console.log(`[submissions-service] Server running on http://localhost:${PORT}`);
  console.log(`[submissions-service] Endpoints disponibles:`);
  console.log(`  POST http://localhost:${PORT}/v1/submissions/run`);
  console.log(`  POST http://localhost:${PORT}/v1/submissions`);
  console.log(`  GET  http://localhost:${PORT}/v1/submissions`);
  console.log(`  GET  http://localhost:${PORT}/v1/submissions/{submissionId}`);
});
