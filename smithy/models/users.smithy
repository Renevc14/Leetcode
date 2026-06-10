$version: "2.0"

namespace com.leetcode.users

use aws.protocols#restJson1
use smithy.framework#ValidationException

/// Servicio de perfiles públicos y estadísticas de usuario
@title("Users Service")
@restJson1
service UsersService {
    version: "2024-01-01"
    operations: [
        GetMe
        GetUser
        GetUserStats
    ]
    errors: [
        ValidationException
    ]
}

// ─── ESTRUCTURAS ──────────────────────────────────────────────────────────────
/// Desglose de problemas resueltos por dificultad
structure DifficultyStats {
    @required
    easy: Integer

    @required
    medium: Integer

    @required
    hard: Integer
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
/// Perfil completo del usuario autenticado — requiere token Bearer válido
@readonly
@http(method: "GET", uri: "/v1/users/me")
operation GetMe {
    input := {}

    output := {
        @required
        id: String

        @required
        username: String

        @required
        email: String

        /// Rol en la plataforma: USER | SETTER | ADMIN
        @required
        role: String

        @required
        createdAt: String
    }

    errors: [
        UnauthorizedError
    ]
}

/// Perfil público de cualquier usuario — acceso anónimo permitido
@readonly
@http(method: "GET", uri: "/v1/users/{userId}")
operation GetUser {
    input := {
        @required
        @httpLabel
        userId: String
    }

    output := {
        @required
        id: String

        @required
        username: String

        @required
        createdAt: String
    }

    errors: [
        UserNotFoundError
    ]
}

/// Estadísticas agregadas públicas de un usuario
@readonly
@http(method: "GET", uri: "/v1/users/{userId}/stats")
operation GetUserStats {
    input := {
        @required
        @httpLabel
        userId: String
    }

    output := {
        @required
        userId: String

        /// Problemas resueltos agrupados por dificultad
        @required
        solvedByDifficulty: DifficultyStats

        /// Ratio de aceptación global (0-100)
        @required
        acceptanceRate: Float

        @required
        contestsPlayed: Integer

        @required
        totalSubmissions: Integer
    }

    errors: [
        UserNotFoundError
    ]
}

// ─── ERRORES ──────────────────────────────────────────────────────────────────
@error("client")
@httpError(401)
structure UnauthorizedError {
    @required
    message: String
}

@error("client")
@httpError(404)
structure UserNotFoundError {
    @required
    message: String
}
