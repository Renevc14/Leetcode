import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { convertRequest, writeResponse } from '@aws-smithy/server-node';
import { getSubmissionsServiceServiceHandler } from '@com.leetcode/submissions-api-server';
import { submissionsServiceImpl } from './SubmissionsServiceImpl.js';

const serviceHandler = getSubmissionsServiceServiceHandler(submissionsServiceImpl);

const server = createServer(function (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage> & { req: IncomingMessage },
) {
  const httpRequest = convertRequest(req);
  void serviceHandler
    .handle(httpRequest, {})
    .then((httpResponse) => writeResponse(httpResponse, res))
    .catch((error: unknown) => {
      console.error('[submissions-service] Request handling error', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
});

const port = 3003;
server.listen(port);
console.log(`submissions-service running on http://localhost:${port}`);
