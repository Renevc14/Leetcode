// Función de routing generada automáticamente por Smithy (typescript-ssdk-codegen)
import { getUsersServiceServiceHandler } from '@com.leetcode/users-api-server';
import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { convertRequest, writeResponse } from '@aws-smithy/server-node';
import { UsersServiceImpl, createInitialContext } from './UsersServiceImpl.js';

const rawPort = process.env['PORT'];
const PORT = rawPort ? parseInt(rawPort, 10) : 3002;

// Instancia de la implementación del servicio
const service = new UsersServiceImpl();

// Handler generado por Smithy — enruta, serializa y deserializa automáticamente
const serviceHandler = getUsersServiceServiceHandler(service);

// Contexto compartido (en producción: pool de conexiones a RDS PostgreSQL)
const ctx = createInitialContext();

const server = createServer(
  (req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage }) => {
    const httpRequest = convertRequest(req);
    void serviceHandler
      .handle(httpRequest, ctx)
      .then((httpResponse) => writeResponse(httpResponse, res))
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
  console.log(`  GET  http://localhost:${PORT}/v1/users/{userId}`);
  console.log(`  GET  http://localhost:${PORT}/v1/users/{userId}/stats`);
  console.log(`[users-service] Usuarios en memoria: ${ctx.users.size}`);
});
