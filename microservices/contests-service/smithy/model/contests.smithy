$version: "2.0"

namespace com.leetcode.contests

use aws.protocols#restJson1
use smithy.framework#ValidationException

/// Servicio de concursos: creación, inscripción y tabla de posiciones (RF6)
@title("Contests Service")
@restJson1
service ContestsService {
    version: "2024-01-01"
    operations: [
        ListContests
        GetContest
        CreateContest
        EnrollContest
        UnenrollContest
        GetContestProblems
        GetLeaderboard
    ]
    errors: [
        ValidationException
    ]
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────
enum ContestStatus {
    UPCOMING = "UPCOMING"
    LIVE = "LIVE"
    FINISHED = "FINISHED"
}

enum Difficulty {
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
}

// ─── ESTRUCTURAS ──────────────────────────────────────────────────────────────
/// Resumen de un concurso para el listado
structure ContestSummary {
    @required
    id: String

    @required
    title: String

    @required
    status: ContestStatus

    @required
    startTime: String

    @required
    endTime: String

    @required
    participantCount: Integer
}

list ContestList {
    member: ContestSummary
}

/// Problema dentro de un concurso
structure ContestProblem {
    @required
    problemId: String

    @required
    title: String

    @required
    difficulty: Difficulty

    @required
    order: Integer
}

list ContestProblemList {
    member: ContestProblem
}

/// Entrada en el leaderboard
structure LeaderboardEntry {
    @required
    rank: Integer

    @required
    userId: String

    @required
    username: String

    @required
    score: Integer

    @required
    solvedCount: Integer

    @required
    penalty: Integer
}

list LeaderboardList {
    member: LeaderboardEntry
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
/// Lista concursos con filtros opcionales
@readonly
@http(method: "GET", uri: "/v1/contests")
operation ListContests {
    input := {
        @httpQuery("status")
        status: ContestStatus

        @httpQuery("page")
        page: Integer

        @httpQuery("pageSize")
        pageSize: Integer
    }

    output := {
        @required
        items: ContestList

        @required
        total: Integer

        @required
        page: Integer
    }

    errors: [
        UnauthorizedError
    ]
}

/// Obtiene detalles completos de un concurso
@readonly
@http(method: "GET", uri: "/v1/contests/{contestId}")
operation GetContest {
    input := {
        @required
        @httpLabel
        contestId: String
    }

    output := {
        @required
        id: String

        @required
        title: String

        @required
        description: String

        @required
        status: ContestStatus

        @required
        startTime: String

        @required
        endTime: String

        @required
        participantCount: Integer

        isEnrolled: Boolean
    }

    errors: [
        UnauthorizedError
        ContestNotFoundError
    ]
}

/// Crea un nuevo concurso (rol SETTER o ADMIN)
@http(method: "POST", uri: "/v1/contests", code: 201)
operation CreateContest {
    input := {
        @required
        title: String

        @required
        description: String

        @required
        startTime: String

        @required
        endTime: String

        /// IDs de los problemas que formarán parte del concurso
        @required
        problemIds: StringList
    }

    output := {
        @required
        id: String

        @required
        title: String

        @required
        status: ContestStatus
    }

    errors: [
        UnauthorizedError
        ForbiddenError
        UnprocessableEntityError
    ]
}

/// Inscribe al usuario autenticado en un concurso
@http(method: "POST", uri: "/v1/contests/{contestId}/enroll", code: 200)
operation EnrollContest {
    input := {
        @required
        @httpLabel
        contestId: String
    }

    output := {
        @required
        message: String
    }

    errors: [
        UnauthorizedError
        ContestNotFoundError
        ConflictError
    ]
}

/// Cancela la inscripción del usuario autenticado
@http(method: "DELETE", uri: "/v1/contests/{contestId}/enroll", code: 200)
operation UnenrollContest {
    input := {
        @required
        @httpLabel
        contestId: String
    }

    output := {
        @required
        message: String
    }

    errors: [
        UnauthorizedError
        ContestNotFoundError
        ConflictError
    ]
}

/// Lista los problemas de un concurso
@readonly
@http(method: "GET", uri: "/v1/contests/{contestId}/problems")
operation GetContestProblems {
    input := {
        @required
        @httpLabel
        contestId: String
    }

    output := {
        @required
        items: ContestProblemList
    }

    errors: [
        UnauthorizedError
        ContestNotFoundError
    ]
}

/// Tabla de posiciones de un concurso
@readonly
@http(method: "GET", uri: "/v1/contests/{contestId}/leaderboard")
operation GetLeaderboard {
    input := {
        @required
        @httpLabel
        contestId: String

        @httpQuery("page")
        page: Integer

        @httpQuery("pageSize")
        pageSize: Integer
    }

    output := {
        @required
        items: LeaderboardList

        @required
        total: Integer

        @required
        page: Integer
    }

    errors: [
        UnauthorizedError
        ContestNotFoundError
    ]
}

// ─── TIPOS AUXILIARES ─────────────────────────────────────────────────────────
list StringList {
    member: String
}

// ─── ERRORES ──────────────────────────────────────────────────────────────────
@error("client")
@httpError(401)
structure UnauthorizedError {
    @required
    message: String
}

@error("client")
@httpError(403)
structure ForbiddenError {
    @required
    message: String
}

@error("client")
@httpError(404)
structure ContestNotFoundError {
    @required
    message: String
}

@error("client")
@httpError(409)
structure ConflictError {
    @required
    message: String
}

@error("client")
@httpError(422)
structure UnprocessableEntityError {
    @required
    message: String
}
