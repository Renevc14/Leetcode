// Función de routing generada automáticamente por Smithy (typescript-ssdk-codegen)
import { getProblemsApiServiceHandler } from '@leetcode/problems-server-sdk';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { convertRequest, writeResponse } from '@aws-smithy/server-node';
import { createInitialContext } from './context.js';
import { ProblemsApiServiceImpl } from './application/ProblemsApiServiceImpl.js';

const rawPort = process.env['PORT'];
const PORT = rawPort ? parseInt(rawPort, 10) : 3001;

// Instancia de la implementación del servicio
const service = new ProblemsApiServiceImpl();

// Handler generado por Smithy — enruta, serializa y deserializa automáticamente
const serviceHandler = getProblemsApiServiceHandler(service);

// Contexto compartido (en producción: pool de conexiones a RDS PostgreSQL)
const ctx = createInitialContext();

const server = createServer(
  (req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage }) => {
    const httpRequest = convertRequest(req);
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
  console.log(`  PATCH  http://localhost:${PORT}/v1/problems/{problemId}`);
  console.log(`  DELETE http://localhost:${PORT}/v1/problems/{problemId}`);
  console.log('[problems-service] Context initialized with Prisma repository');
});
