$version: "2"

namespace leetcode.users

use aws.protocols#restJson1
use leetcode.shared#InternalServerError
use leetcode.shared#NotFoundError
use leetcode.shared#UnauthorizedError
use smithy.api#documentation
use smithy.api#examples
use smithy.api#httpBearerAuth
use smithy.api#idempotent
use smithy.api#internal
use smithy.api#length
use smithy.api#optionalAuth
use smithy.api#pattern
use smithy.framework#ValidationException

@title("Users Service")
@httpBearerAuth
@restJson1
service UsersApi {
    version: "2026-08-06"
    operations: [
        GetMe
        GetUser
        GetMyProblemStatuses
        RecordProblemStatus
    ]
    errors: [
        ValidationException
    ]
}

@documentation("Identificador UUID único del usuario.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string UserId

@documentation("Identificador UUID único del problema.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string ProblemId

// ─── ENUMS ────────────────────────────────────────────────────────────────────
@documentation("Estado de progreso del usuario respecto a un problema específico.")
enum UserProblemStatus {
    @documentation("El usuario ha intentado resolver el problema pero no lo ha completado exitosamente.")
    ATTEMPTED

    @documentation("El usuario ha resuelto el problema exitosamente con al menos una solución aceptada.")
    SOLVED
}

// ─── LISTAS ───────────────────────────────────────────────────────────────────
@documentation("Colección de estados de problemas del usuario.")
list UserProblemStatusList {
    member: UserProblemStatusDetail
}

// ─── ESTRUCTURAS ──────────────────────────────────────────────────────────────
@documentation("Perfil completo del usuario autenticado con toda la información privada y pública.")
structure UserProfile {
    @documentation("Identificador único del usuario en el sistema.")
    @required
    id: UserId

    @documentation("Nombre de usuario único utilizado para login y visualización en URLs.")
    @required
    @length(min: 3, max: 32)
    @pattern("^[a-zA-Z0-9_-]+$")
    userName: String

    @documentation("Nombre mostrado públicamente en el perfil del usuario.")
    @required
    @length(min: 1, max: 100)
    displayName: String

    @documentation("Correo electrónico del usuario registrado en la plataforma.")
    @required
    @length(min: 5, max: 255)
    @pattern("^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$")
    email: String

    @documentation("Biografía opcional del usuario en formato texto plano.")
    @length(min: 1, max: 500)
    bio: String

    @documentation("URL de la imagen de avatar del usuario.")
    @length(min: 1, max: 2048)
    @pattern("^https?://.*$")
    avatarUrl: String

    @documentation("Código de país del usuario en formato ISO 3166-1 alpha-2.")
    @length(min: 2, max: 2)
    @pattern("^[A-Z]{2}$")
    countryCode: String
}

@documentation("Perfil público de un usuario con información visible para todos.")
structure PublicUserProfile {
    @documentation("Identificador único del usuario en el sistema.")
    @required
    id: UserId

    @documentation("Nombre de usuario único utilizado en URLs y visualización pública.")
    @required
    @length(min: 3, max: 32)
    userName: String

    @documentation("Nombre mostrado públicamente en el perfil del usuario.")
    @required
    @length(min: 1, max: 100)
    displayName: String

    @documentation("Biografía opcional del usuario en formato texto plano.")
    @length(min: 1, max: 500)
    bio: String

    @documentation("URL de la imagen de avatar del usuario.")
    @length(min: 1, max: 2048)
    avatarUrl: String

    @documentation("Código de país del usuario en formato ISO 3166-1 alpha-2.")
    @length(min: 2, max: 2)
    countryCode: String
}

@documentation("Estado de progreso de un usuario respecto a un problema individual.")
structure UserProblemStatusDetail {
    @documentation("Identificador del problema al que pertenece este estado.")
    @required
    problemId: ProblemId

    @documentation("Estado actual del usuario respecto a este problema.")
    @required
    status: UserProblemStatus

    @documentation("Fecha y hora de la última actualización de este estado en formato ISO 8601.")
    @required
    updatedAt: Timestamp
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
@documentation("Obtiene el perfil completo del usuario autenticado, incluyendo información privada como email y authentikId. Requiere autenticación Bearer válida.")
@examples([
    {
        title: "Obtener perfil del usuario autenticado"
        input: {}
        output: { id: "550e8400-e29b-41d4-a716-446655440010", userName: "john_doe", displayName: "John Doe", email: "john.doe@example.com", bio: "Apasionado por algoritmos y estructuras de datos", avatarUrl: "https://example.com/avatars/john_doe.jpg", countryCode: "US" }
    }
])
@readonly
@http(method: "GET", uri: "/v1/users/me", code: 200)
operation GetMe {
    input := {}
    output: UserProfile
    errors: [
        UnauthorizedError
        InternalServerError
    ]
}

@documentation("Obtiene el perfil público de un usuario específico por su identificador. Esta operación no requiere autenticación y solo retorna información pública.")
@examples([
    {
        title: "Obtener perfil público por ID de usuario"
        input: { userId: "550e8400-e29b-41d4-a716-446655440011" }
        output: { id: "550e8400-e29b-41d4-a716-446655440011", userName: "jane_smith", displayName: "Jane Smith", bio: "Desarrolladora full-stack interesada en algoritmos", avatarUrl: "https://example.com/avatars/jane_smith.jpg", countryCode: "CA" }
    }
    {
        title: "Usuario sin biografía ni avatar"
        input: { userId: "550e8400-e29b-41d4-a716-446655440012" }
        output: { id: "550e8400-e29b-41d4-a716-446655440012", userName: "minimal_user", displayName: "Minimal User" }
    }
])
@readonly
@optionalAuth
@http(method: "GET", uri: "/v1/users/{userId}", code: 200)
operation GetUser {
    input := {
        @required
        @httpLabel
        userId: UserId
    }

    output: PublicUserProfile

    errors: [
        NotFoundError
        InternalServerError
    ]
}

@documentation("Registra o actualiza el estado de progreso del usuario autenticado para un problema. Operación interna invocada por el juez tras emitir el veredicto final. El estado solo avanza: ATTEMPTED nunca sobreescribe SOLVED.")
@internal
@idempotent
@http(method: "PUT", uri: "/v1/users/me/problem-statuses/{problemId}", code: 204)
operation RecordProblemStatus {
    input := {
        @required
        @httpLabel
        problemId: ProblemId

        @required
        status: UserProblemStatus
    }

    output := {}

    errors: [
        UnauthorizedError
        InternalServerError
    ]
}

@documentation("Obtiene la lista de estados de progreso de problemas para el usuario autenticado. Retorna todos los problemas que el usuario ha intentado o resuelto.")
@examples([
    {
        title: "Obtener estados de problemas del usuario autenticado"
        input: {}
        output: {
            items: [
                {
                    problemId: "550e8400-e29b-41d4-a716-446655440000"
                    status: "SOLVED"
                    updatedAt: "2024-05-15T16:45:00Z"
                }
                {
                    problemId: "550e8400-e29b-41d4-a716-446655440001"
                    status: "ATTEMPTED"
                    updatedAt: "2024-06-01T09:30:00Z"
                }
                {
                    problemId: "550e8400-e29b-41d4-a716-446655440005"
                    status: "SOLVED"
                    updatedAt: "2024-06-10T11:20:00Z"
                }
            ]
        }
    }
    {
        title: "Usuario sin problemas intentados"
        input: {}
        output: {
            items: []
        }
    }
])
@readonly
@http(method: "GET", uri: "/v1/users/me/problem-statuses", code: 200)
operation GetMyProblemStatuses {
    input := {}

    output := {
        @documentation("Lista de estados de problemas del usuario autenticado.")
        @required
        items: UserProblemStatusList
    }

    errors: [
        UnauthorizedError
        InternalServerError
    ]
}
