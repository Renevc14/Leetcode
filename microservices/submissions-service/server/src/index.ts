import { IncomingMessage, ServerResponse, createServer } from "http";
import { convertRequest, writeResponse } from "@aws-smithy/server-node";
import { getSubmissionsServiceServiceHandler } from "@com.leetcode/submissions-server";
import { submissionsServiceImpl } from "./SubmissionsServiceImpl";

const serviceHandler = getSubmissionsServiceServiceHandler(submissionsServiceImpl);

const server = createServer(async function (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage> & { req: IncomingMessage }
) {
  const httpRequest = convertRequest(req);
  const httpResponse = await serviceHandler.handle(httpRequest, {});
  return writeResponse(httpResponse, res);
});

const port = 3003;
server.listen(port);
console.log(`submissions-service running on http://localhost:${port}`);
