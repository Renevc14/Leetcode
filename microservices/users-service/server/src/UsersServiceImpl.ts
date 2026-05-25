// Tipos e interfaz de servicio — generados automáticamente por Smithy (typescript-ssdk-codegen)
import {
  UsersServiceService,
  GetMeServerInput,
  GetMeServerOutput,
  GetUserServerInput,
  GetUserServerOutput,
  GetUserStatsServerInput,
  GetUserStatsServerOutput,
  UnauthorizedError,
  UserNotFoundError,
} from "@com.leetcode/users-server";

// ─── Tipos internos ────────────────────────────────────────────────────────────

type UserRole = "USER" | "SETTER" | "ADMIN";

interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  stats: {
    solvedEasy: number;
    solvedMedium: number;
    solvedHard: number;
    totalSubmissions: number;
    acceptedSubmissions: number;
    contestsPlayed: number;
  };
}

// ─── Contexto del servicio ─────────────────────────────────────────────────────

export interface UsersContext {
  // En producción: conexión a RDS PostgreSQL (tabla users)
  users: Map<string, UserRecord>;
  // userId del token JWT actual (null si es anónimo)
  currentUserId: string | null;
}

// ─── Datos semilla para pruebas ────────────────────────────────────────────────

export function createInitialContext(): UsersContext {
  const users = new Map<string, UserRecord>();

  const seed: UserRecord[] = [
    {
      id: "user-001",
      username: "alice_dev",
      email: "alice@example.com",
      role: "USER",
      createdAt: "2024-01-15T08:00:00Z",
      stats: {
        solvedEasy: 45,
        solvedMedium: 23,
        solvedHard: 5,
        totalSubmissions: 312,
        acceptedSubmissions: 217,
        contestsPlayed: 8,
      },
    },
    {
      id: "user-002",
      username: "bob_setter",
      email: "bob@example.com",
      role: "SETTER",
      createdAt: "2024-01-10T08:00:00Z",
      stats: {
        solvedEasy: 120,
        solvedMedium: 87,
        solvedHard: 34,
        totalSubmissions: 890,
        acceptedSubmissions: 712,
        contestsPlayed: 25,
      },
    },
    {
      id: "user-003",
      username: "carol_admin",
      email: "carol@example.com",
      role: "ADMIN",
      createdAt: "2024-01-01T08:00:00Z",
      stats: {
        solvedEasy: 200,
        solvedMedium: 150,
        solvedHard: 60,
        totalSubmissions: 1500,
        acceptedSubmissions: 1350,
        contestsPlayed: 40,
      },
    },
  ];

  for (const u of seed) {
    users.set(u.id, u);
  }

  return { users, currentUserId: "user-001" };
}

// ─── Implementación del servicio ───────────────────────────────────────────────

export class UsersServiceImpl implements UsersServiceService<UsersContext> {

  async GetMe(
    _input: GetMeServerInput,
    ctx: UsersContext
  ): Promise<GetMeServerOutput> {
    // En producción: extraer userId del claim 'sub' del JWT validado por API Gateway
    if (!ctx.currentUserId) {
      throw new UnauthorizedError({
        message: "Authentication required. Please provide a valid Bearer token.",
      });
    }

    const user = ctx.users.get(ctx.currentUserId);
    if (!user) {
      throw new UnauthorizedError({
        message: "Token is valid but user no longer exists.",
      });
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async GetUser(
    input: GetUserServerInput,
    ctx: UsersContext
  ): Promise<GetUserServerOutput> {
    const user = ctx.users.get(input.userId);

    if (!user) {
      throw new UserNotFoundError({
        message: `User '${input.userId}' not found.`,
      });
    }

    // Perfil público — nunca se expone email ni datos sensibles
    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  async GetUserStats(
    input: GetUserStatsServerInput,
    ctx: UsersContext
  ): Promise<GetUserStatsServerOutput> {
    const user = ctx.users.get(input.userId);

    if (!user) {
      throw new UserNotFoundError({
        message: `User '${input.userId}' not found.`,
      });
    }

    const { stats } = user;
    const acceptanceRate =
      stats.totalSubmissions > 0
        ? Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100)
        : 0;

    return {
      userId: user.id,
      solvedByDifficulty: {
        easy: stats.solvedEasy,
        medium: stats.solvedMedium,
        hard: stats.solvedHard,
      },
      acceptanceRate,
      contestsPlayed: stats.contestsPlayed,
      totalSubmissions: stats.totalSubmissions,
    };
  }
}
