import { IncomingMessage, ServerResponse, createServer } from "http";
import { convertRequest, writeResponse } from "@aws-smithy/server-node";
import { getContestsServiceServiceHandler } from "@com.leetcode/contests-server";
import { contestsServiceImpl } from "./ContestsServiceImpl";

const serviceHandler = getContestsServiceServiceHandler(contestsServiceImpl);

const server = createServer(async function (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage> & { req: IncomingMessage }
) {
  const httpRequest = convertRequest(req);
  const httpResponse = await serviceHandler.handle(httpRequest, {});
  return writeResponse(httpResponse, res);
});

const port = 3004;
server.listen(port);
console.log(`contests-service running on http://localhost:${port}`);
