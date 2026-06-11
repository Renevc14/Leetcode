// Función de routing generada automáticamente por Smithy (typescript-ssdk-codegen)
import { getProblemsServiceServiceHandler } from '@com.leetcode/problems-api-server';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { convertRequest, writeResponse } from '@aws-smithy/server-node';
import { ProblemsServiceImpl, createInitialContext } from './ProblemsServiceImpl.js';

const rawPort = process.env['PORT'];
const PORT = rawPort ? parseInt(rawPort, 10) : 3001;

// Instancia de la implementación del servicio
const service = new ProblemsServiceImpl();

// Handler generado por Smithy — enruta, serializa y deserializa automáticamente
const serviceHandler = getProblemsServiceServiceHandler(service);

// Contexto compartido (en producción: pool de conexiones a RDS PostgreSQL)
const ctx = createInitialContext();

const server = createServer(
  (req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage }) => {
    const httpRequest = convertRequest(req);
    void serviceHandler
      .handle(httpRequest, ctx)
      .then((httpResponse) => writeResponse(httpResponse, res))
      .catch((error: unknown) => {
        console.error('[problems-service] Request handling error', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
  },
);

server.listen(PORT, () => {
  console.log(`[problems-service] Server running on http://localhost:${PORT}`);
  console.log(`[problems-service] Endpoints disponibles:`);
  console.log(`  GET    http://localhost:${PORT}/v1/problems`);
  console.log(`  GET    http://localhost:${PORT}/v1/problems/{problemId}`);
  console.log(`  POST   http://localhost:${PORT}/v1/problems`);
  console.log(`  PUT    http://localhost:${PORT}/v1/problems/{problemId}`);
  console.log(`  PATCH  http://localhost:${PORT}/v1/problems/{problemId}/disable`);
  console.log(`[problems-service] Problemas en memoria: ${ctx.problems.size}`);
});
