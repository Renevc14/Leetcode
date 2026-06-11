import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { convertRequest, writeResponse } from '@aws-smithy/server-node';
import { getContestsServiceServiceHandler } from '@com.leetcode/contests-api-server';
import { contestsServiceImpl } from './ContestsServiceImpl.js';

const serviceHandler = getContestsServiceServiceHandler(contestsServiceImpl);

const server = createServer(function (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage> & { req: IncomingMessage },
) {
  const httpRequest = convertRequest(req);
  void serviceHandler
    .handle(httpRequest, {})
    .then((httpResponse) => writeResponse(httpResponse, res))
    .catch((error: unknown) => {
      console.error('[contests-service] Request handling error', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
});

const port = 3004;
server.listen(port);
console.log(`contests-service running on http://localhost:${port}`);
