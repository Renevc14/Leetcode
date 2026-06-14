$version: "2"

namespace leetcode.contests

use aws.protocols#restJson1
use leetcode.shared#ConflictError
use leetcode.shared#Cursor
use leetcode.shared#ForbiddenError
use leetcode.shared#InternalServerError
use leetcode.shared#NotFoundError
use leetcode.shared#PaginatedInput
use leetcode.shared#StringList
use leetcode.shared#UnauthorizedError
use leetcode.shared#UnprocessableEntityError
use leetcode.shared#requiresScope
use smithy.api#documentation
use smithy.api#httpBearerAuth
use smithy.api#optionalAuth
use smithy.api#pattern
use smithy.framework#ValidationException

@title("Contests Service")
@documentation("Servicio de concursos para listar competencias, inscribir usuarios y consultar tables de posiciones.")
@httpBearerAuth
@restJson1
@paginated(inputToken: "cursor", outputToken: "nextCursor", pageSize: "limit")
service ContestsApi {
    version: "2024-01-01"
    operations: [
        ListContests
        GetContest
        CreateContest
        UpdateContest
        DeleteContest
        EnrollContest
        UnenrollContest
        GetContestProblems
        GetContestLeaderboard
    ]
    errors: [
        ValidationException
    ]
}

@documentation("Identificador UUID único de un concurso.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string ContestId

@documentation("Estado de un concurso usado en filtrado y presentación.")
enum ContestStatus {
    @documentation("El concurso aún no ha comenzado.")
    UPCOMING = "UPCOMING"

    @documentation("El concurso está en curso.")
    ONGOING = "ONGOING"

    @documentation("El concurso ya ha finalizado.")
    FINISHED = "FINISHED"

    @documentation("El concurso fue cancelado.")
    CANCELED = "CANCELED"
}

@documentation("Resumen de un concurso en los listados públicos.")
structure ContestSummary {
    @documentation("Identificador único del concurso.")
    @required
    id: ContestId

    @documentation("Slug legible usado en las URLs del concurso.")
    @required
    @length(min: 3, max: 120)
    slug: String

    @documentation("Título del concurso mostrado en la interfaz.")
    @required
    @length(min: 1, max: 160)
    title: String

    @documentation("Estado actual del concurso.")
    @required
    status: ContestStatus

    @documentation("Fecha y hora de inicio del concurso en formato ISO 8601.")
    @required
    startsAt: String

    @documentation("Fecha y hora de fin del concurso en formato ISO 8601.")
    @required
    endsAt: String

    @documentation("Número de participantes ya inscritos.")
    @required
    participantCount: Integer

    @documentation("Máximo de participantes permitidos. Ausente cuando no existe límite.")
    maxParticipants: Integer
}

@documentation("Colección paginada con resúmenes de concursos.")
list ContestSummaryList {
    member: ContestSummary
}

@documentation("Detalles completos de un concurso.")
structure ContestDetail {
    @documentation("Identificador único del concurso.")
    @required
    id: ContestId

    @documentation("Slug legible usado en las URLs del concurso.")
    @required
    @length(min: 3, max: 120)
    slug: String

    @documentation("Título del concurso mostrado en la interfaz.")
    @required
    @length(min: 1, max: 160)
    title: String

    @documentation("Descripción completa del concurso.")
    @required
    @length(min: 1, max: 20000)
    description: String

    @documentation("Estado actual del concurso.")
    @required
    status: ContestStatus

    @documentation("Fecha y hora de inicio del concurso en formato ISO 8601.")
    @required
    startsAt: String

    @documentation("Fecha y hora de fin del concurso en formato ISO 8601.")
    @required
    endsAt: String

    @documentation("Número de participantes ya inscritos.")
    @required
    participantCount: Integer

    @documentation("Máximo de participantes permitidos. Ausente cuando no existe límite.")
    maxParticipants: Integer

    @documentation("Indica si el usuario autenticado está inscrito en el concurso.")
    isEnrolled: Boolean
}

@documentation("Problema asociado a un concurso.")
structure ContestProblem {
    @documentation("Identificador único del problema.")
    @required
    problemId: String

    @documentation("Título del problema en el concurso.")
    @required
    title: String

    @documentation("Dificultad del problema.")
    @required
    difficulty: String

    @documentation("Posición del problema dentro del concurso.")
    @required
    orderIndex: Integer
}

@documentation("Colección de problemas asignados a un concurso.")
list ContestProblemList {
    member: ContestProblem
}

@documentation("Entrada del leaderboard de un concurso.")
structure LeaderboardEntry {
    @documentation("Posición del participante en la tabla.")
    @required
    rank: Integer

    @documentation("Identificador único del usuario.")
    @required
    userId: String

    @documentation("Nombre de usuario mostrado en el leaderboard.")
    @required
    username: String

    @documentation("Cantidad de problemas resueltos por el participante.")
    @required
    solvedCount: Integer

    @documentation("Tiempo total acumulado en minutos para los problemas resueltos.")
    @required
    totalTimeMinutes: Integer
}

@documentation("Colección de entradas del leaderboard.")
list LeaderboardList {
    member: LeaderboardEntry
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
@documentation("Lista los concursos disponibles, opcionalmente filtrados por estado.")
@examples([
    {
        title: "Primera página de concursos próximos"
        input: { status: "UPCOMING", limit: 10 }
        output: {
            items: [
                {
                    id: "550e8400-e29b-41d4-a716-446655440000"
                    slug: "maraton-algoritmos"
                    title: "Maratón de Algoritmos"
                    status: "UPCOMING"
                    startsAt: "2026-07-01T09:00:00Z"
                    endsAt: "2026-07-01T13:00:00Z"
                    participantCount: 12
                    maxParticipants: 100
                }
            ]
        }
    }
    {
        title: "Continuar paginación usando cursor"
        input: { cursor: "eyJsYXN0SWQiOiI1NTBlODQwMCJ9", limit: 10 }
        output: {
            items: [
                {
                    id: "550e8400-e29b-41d4-a716-446655440005"
                    slug: "concurso-especial"
                    title: "Concurso Especial"
                    status: "ONGOING"
                    startsAt: "2026-06-14T09:00:00Z"
                    endsAt: "2026-06-14T13:00:00Z"
                    participantCount: 432
                }
            ]
            nextCursor: "eyJsYXN0SWQiOiI1NTBlODQwNSJ9"
        }
    }
])
@readonly
@optionalAuth
@http(method: "GET", uri: "/v1/contests")
operation ListContests {
    input := with [PaginatedInput] {
        @documentation("Filtro opcional por estado del concurso.")
        @httpQuery("status")
        status: ContestStatus

        @documentation("Búsqueda de texto libre que coincide con título o descripción.")
        @httpQuery("q")
        search: String
    }

    output := {
        @required
        items: ContestSummaryList

        nextCursor: Cursor
    }

    errors: [
        InternalServerError
    ]
}

@documentation("Recupera los detalles de un concurso por su identificador.")
@examples([
    {
        title: "Obtener un concurso existente"
        input: { contestId: "550e8400-e29b-41d4-a716-446655440000" }
        output: { id: "550e8400-e29b-41d4-a716-446655440000", slug: "maraton-algoritmos", title: "Maratón de Algoritmos", description: "Una competencia de 4 horas con problemas de algoritmos y estructuras de datos.", status: "UPCOMING", startsAt: "2026-07-01T09:00:00Z", endsAt: "2026-07-01T13:00:00Z", participantCount: 12, maxParticipants: 100, isEnrolled: false }
    }
])
@readonly
@optionalAuth
@http(method: "GET", uri: "/v1/contests/{contestId}", code: 200)
operation GetContest {
    input := {
        @required
        @httpLabel
        contestId: ContestId
    }

    output: ContestDetail

    errors: [
        UnauthorizedError
        NotFoundError
    ]
}

@documentation("Crea un nuevo concurso con la lista de problemas que lo componen.")
@examples([
    {
        title: "Crear un concurso nuevo"
        input: {
            slug: "maraton-algoritmos"
            title: "Maratón de Algoritmos"
            description: "Competencia de 4 horas con problemas de algoritmos y estructuras de datos."
            startsAt: "2026-07-01T09:00:00Z"
            endsAt: "2026-07-01T13:00:00Z"
            maxParticipants: 100
            problemIds: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
        }
        output: { id: "550e8400-e29b-41d4-a716-446655440010", slug: "maraton-algoritmos", title: "Maratón de Algoritmos", description: "Competencia de 4 horas con problemas de algoritmos y estructuras de datos.", status: "UPCOMING", startsAt: "2026-07-01T09:00:00Z", endsAt: "2026-07-01T13:00:00Z", participantCount: 0, maxParticipants: 100, isEnrolled: false }
    }
])
@requiresScope(
    scopes: ["contests:write"]
)
@http(method: "POST", uri: "/v1/contests", code: 201)
operation CreateContest {
    input := {
        @documentation("Slug único usado para identificar el concurso en las URLs.")
        @required
        @length(min: 3, max: 120)
        slug: String

        @documentation("Título del concurso mostrado en la interfaz.")
        @required
        @length(min: 1, max: 160)
        title: String

        @documentation("Descripción completa del concurso.")
        @required
        @length(min: 1, max: 20000)
        description: String

        @documentation("Fecha y hora de inicio del concurso en formato ISO 8601.")
        @required
        startsAt: String

        @documentation("Fecha y hora de fin del concurso en formato ISO 8601.")
        @required
        endsAt: String

        @documentation("Número máximo de participantes permitidos. Ausente cuando no hay límite.")
        maxParticipants: Integer

        @documentation("IDs de problemas que forman parte del concurso, en orden.")
        @required
        problemIds: StringList
    }

    output: ContestDetail

    errors: [
        ValidationException
        UnauthorizedError
        ForbiddenError
        ConflictError
        UnprocessableEntityError
        InternalServerError
    ]
}

@documentation("Actualiza parcialmente los datos de un concurso existente.")
@requiresScope(
    scopes: ["contests:write"]
)
@http(method: "PATCH", uri: "/v1/contests/{contestId}", code: 200)
operation UpdateContest {
    input := {
        @required
        @httpLabel
        contestId: ContestId

        @documentation("Slug único usado para identificar el concurso en las URLs.")
        @length(min: 3, max: 120)
        slug: String

        @documentation("Título del concurso mostrado en la interfaz.")
        @length(min: 1, max: 160)
        title: String

        @documentation("Descripción completa del concurso.")
        @length(min: 1, max: 20000)
        description: String

        @documentation("Fecha y hora de inicio del concurso en formato ISO 8601.")
        startsAt: String

        @documentation("Fecha y hora de fin del concurso en formato ISO 8601.")
        endsAt: String

        @documentation("Número máximo de participantes permitidos. Ausente cuando no hay límite.")
        maxParticipants: Integer

        @documentation("Estado del concurso.")
        status: ContestStatus

        @documentation("IDs de problemas que forman parte del concurso, en orden.")
        problemIds: StringList
    }

    output: ContestDetail

    errors: [
        ValidationException
        UnauthorizedError
        ForbiddenError
        ConflictError
        UnprocessableEntityError
        InternalServerError
    ]
}

@documentation("Cancela un concurso sin borrarlo de la base de datos. La operación marca su estado como CANCELED.")
@requiresScope(
    scopes: ["contests:write"]
)
@idempotent
@http(method: "DELETE", uri: "/v1/contests/{contestId}", code: 204)
operation DeleteContest {
    input := {
        @required
        @httpLabel
        contestId: ContestId
    }

    output: Unit

    errors: [
        UnauthorizedError
        ForbiddenError
        NotFoundError
        InternalServerError
    ]
}

@documentation("Inscribe al usuario autenticado en un concurso.")
@requiresScope(
    scopes: ["contests:participate"]
)
@http(method: "POST", uri: "/v1/contests/{contestId}/enroll", code: 200)
operation EnrollContest {
    input := {
        @required
        @httpLabel
        contestId: ContestId
    }

    output := {
        @documentation("Mensaje de confirmación de la inscripción.")
        @required
        message: String
    }

    errors: [
        UnauthorizedError
        ForbiddenError
        NotFoundError
        ConflictError
    ]
}

@documentation("Cancela la inscripción del usuario autenticado en un concurso.")
@requiresScope(
    scopes: ["contests:participate"]
)
@idempotent
@http(method: "DELETE", uri: "/v1/contests/{contestId}/enroll", code: 200)
operation UnenrollContest {
    input := {
        @required
        @httpLabel
        contestId: ContestId
    }

    output := {
        @documentation("Mensaje de confirmación de la cancelación de inscripción.")
        @required
        message: String
    }

    errors: [
        UnauthorizedError
        ForbiddenError
        NotFoundError
    ]
}

@documentation("Lista los problemas asociados a un concurso.")
@examples([
    {
        title: "Obtener los problemas de un concurso"
        input: { contestId: "550e8400-e29b-41d4-a716-446655440000" }
        output: {
            items: [
                {
                    problemId: "550e8400-e29b-41d4-a716-446655440000"
                    title: "Dos sumas"
                    difficulty: "EASY"
                    orderIndex: 1
                }
                {
                    problemId: "550e8400-e29b-41d4-a716-446655440001"
                    title: "Búsqueda binaria"
                    difficulty: "MEDIUM"
                    orderIndex: 2
                }
            ]
        }
    }
])
@readonly
@optionalAuth
@http(method: "GET", uri: "/v1/contests/{contestId}/problems")
operation GetContestProblems {
    input := {
        @required
        @httpLabel
        contestId: ContestId
    }

    output := {
        @required
        items: ContestProblemList
    }

    errors: [
        UnauthorizedError
        NotFoundError
    ]
}

@documentation("Obtiene la tabla de posiciones de un concurso.")
@examples([
    {
        title: "Obtener la primera página del leaderboard"
        input: { contestId: "550e8400-e29b-41d4-a716-446655440000", limit: 10 }
        output: {
            items: [
                {
                    rank: 1
                    userId: "550e8400-e29b-41d4-a716-446655440100"
                    username: "algoritmos_pro"
                    solvedCount: 5
                    totalTimeMinutes: 120
                }
            ]
            nextCursor: "eyJsYXN0SWQiOiI1NTBlODQwMCJ9"
        }
    }
])
@readonly
@optionalAuth
@http(method: "GET", uri: "/v1/contests/{contestId}/leaderboard")
operation GetContestLeaderboard {
    input := with [PaginatedInput] {
        @required
        @httpLabel
        contestId: ContestId
    }

    output := {
        @required
        items: LeaderboardList

        nextCursor: Cursor
    }

    errors: [
        UnauthorizedError
        NotFoundError
    ]
}
