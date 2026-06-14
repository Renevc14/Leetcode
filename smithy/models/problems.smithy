$version: "2"

namespace leetcode.problems

use aws.protocols#restJson1
use leetcode.shared#Cursor
use leetcode.shared#ForbiddenError
use leetcode.shared#InternalServerError
use leetcode.shared#NotFoundError
use leetcode.shared#PaginatedInput
use leetcode.shared#StringList
use leetcode.shared#UnauthorizedError
use leetcode.shared#requiresScope
use smithy.api#documentation
use smithy.api#examples
use smithy.api#httpBearerAuth
use smithy.api#internal
use smithy.api#length
use smithy.api#optionalAuth
use smithy.api#pattern
use smithy.api#range
use smithy.framework#ValidationException

@title("Problems Service")
@httpBearerAuth
@restJson1
@paginated(inputToken: "cursor", outputToken: "nextCursor", pageSize: "limit")
service ProblemsApi {
    version: "2026-08-06"
    resources: [
        Problem
    ]
    errors: [
        ValidationException
    ]
}

@documentation("Identificador UUID único del problema.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string ProblemId

@documentation("Identificador UUID único de un caso de prueba.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string TestCaseId

// ─── ENUMS ────────────────────────────────────────────────────────────────────
@documentation("Nivel de dificultad de un problema, usado para filtrado y presentación en el catálogo.")
enum Difficulty {
    @documentation("Baja complejidad; orientado a principiantes o calentamiento.")
    EASY

    @documentation("Complejidad moderada; requiere conocimiento algorítmico intermedio.")
    MEDIUM

    @documentation("Alta complejidad; requiere dominio de estructuras de datos avanzadas o matemáticas.")
    HARD
}

@documentation("Lenguaje de programación en el que el usuario puede enviar su solución.")
enum Language {
    @documentation("Python 3.")
    PYTHON

    @documentation("Java (versión LTS más reciente soportada por el juez).")
    JAVA

    @documentation("C++17.")
    CPP

    @documentation("JavaScript (Node.js LTS).")
    JAVASCRIPT

    @documentation("TypeScript (compilado con tsc antes de ejecutarse en Node.js LTS).")
    TYPESCRIPT
}

@documentation("Estado de progreso del usuario autenticado respecto a un problema concreto.")
enum UserProblemStatus {
    @documentation("El usuario no ha intentado resolver el problema.")
    NOT_ATTEMPTED

    @documentation("El usuario ha enviado al menos un intento pero ninguno fue aceptado.")
    ATTEMPTED

    @documentation("El usuario tiene al menos un envío aceptado.")
    SOLVED
}

// ─── LISTAS ───────────────────────────────────────────────────────────────────
@documentation("Idiomas de programación soportados para resolver el problema.")
list LanguageList {
    member: Language
}

@documentation("Colección paginada con resúmenes de problemas.")
list ProblemSummaryList {
    member: ProblemSummary
}

@documentation("Colección de casos de prueba asociados a la definición del problema.")
list TestCaseInputList {
    member: TestCaseInput
}

@documentation("Colección de casos de prueba devueltos al cliente.")
list TestCaseOutputList {
    member: TestCaseOutput
}

// ─── ESTRUCTURAS ──────────────────────────────────────────────────────────────
@documentation("Caso de prueba individual almacenado con la definición del problema.")
structure TestCaseInput {
    @documentation("Entrada consumida por el juez para evaluar la solución.")
    @required
    @length(min: 1, max: 20000)
    input: String

    @documentation("Salida esperada para este caso de prueba.")
    @required
    @length(min: 1, max: 20000)
    expectedOutput: String

    @documentation("Indica si el caso de prueba se muestra como ejemplo público al usuario.")
    @required
    isSample: Boolean
}

@documentation("Detalles públicos de un caso de prueba devueltos para demostración.")
structure TestCaseOutput {
    @documentation("Identificador único del caso de prueba. Necesario para correlacionar resultados de ejecución con el caso evaluado.")
    @required
    id: TestCaseId

    @documentation("Entrada consumida por el juez para evaluar la solución.")
    @required
    @length(min: 1, max: 20000)
    input: String

    @documentation("Salida esperada para este caso de prueba.")
    @required
    @length(min: 1, max: 20000)
    expectedOutput: String

    @documentation("Indica si el caso de prueba se muestra como ejemplo público al usuario.")
    isSample: Boolean
}

@documentation("Detalles completos del problema devueltos para la vista individual.")
structure ProblemDetail {
    @required
    id: ProblemId

    @documentation("Slug legible usado en las URLs del problema.")
    @required
    @length(min: 3, max: 120)
    slug: String

    @documentation("Título del problema mostrado en el catálogo y en la vista de detalle.")
    @required
    @length(min: 1, max: 160)
    title: String

    @documentation("Enunciado del problema en formato Markdown.")
    @required
    @length(min: 1, max: 50000)
    descriptionMd: String

    @documentation("Restricciones y notas del problema en formato Markdown.")
    @required
    @length(min: 1, max: 10000)
    constraintsMd: String

    @required
    difficulty: Difficulty

    @documentation("Límite de tiempo de ejecución en milisegundos.")
    @required
    @range(min: 100, max: 10000)
    timeLimitMs: Integer

    @documentation("Límite de memoria en megabytes.")
    @required
    @range(min: 16, max: 1024)
    memoryLimitMb: Integer

    @documentation("Idiomas de programación permitidos para resolver este problema.")
    @required
    @length(min: 1, max: 5)
    allowedLanguages: LanguageList

    @documentation("Categorías del problema usadas para filtrado y descubrimiento.")
    @required
    @length(min: 1, max: 10)
    categories: StringList

    @documentation("Tasa de aceptación expresada como porcentaje de 0 a 100.")
    @required
    @range(min: 0.0, max: 100.0)
    acceptanceRate: Double

    @documentation("Casos de prueba públicos (isSample=true) visibles al usuario. Solo se incluyen todos cuando se solicita con el parámetro interno allTestCases.")
    testCases: TestCaseOutputList

    @documentation("Estado del usuario autenticado respecto a este problema. Ausente cuando la petición no incluye token de autenticación.")
    userStatus: UserProblemStatus
}

@documentation("Resumen compacto usado en la vista de catálogo de problemas.")
structure ProblemSummary {
    @required
    id: ProblemId

    @documentation("Slug legible usado en las URLs del problema.")
    @required
    @length(min: 3, max: 120)
    slug: String

    @documentation("Título del problema mostrado en el catálogo.")
    @required
    @length(min: 1, max: 160)
    title: String

    @required
    difficulty: Difficulty

    @documentation("Categorías del problema usadas para filtrado y descubrimiento.")
    @required
    @length(min: 1, max: 10)
    categories: StringList

    @documentation("Tasa de aceptación expresada como porcentaje de 0 a 100.")
    @required
    @range(min: 0.0, max: 100.0)
    acceptanceRate: Double

    @documentation("Estado del usuario autenticado respecto a este problema en el catálogo. Ausente cuando la petición no incluye token.")
    userStatus: UserProblemStatus
}

// ─── RECURSOS ───────────────────────────────────────────────────────────────
resource Problem {
    identifiers: {
        problemId: ProblemId
    }
    read: GetProblem
    list: ListProblems
    create: CreateProblem
    update: UpdateProblem
    delete: DeleteProblem
    operations: [
        RecordSubmissionResult
    ]
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
@documentation("Lista los problemas disponibles, opcionalmente filtrados por dificultad, categoría o estado del usuario.")
@examples([
    {
        title: "Primera página de problemas fáciles de matemáticas"
        input: { difficulty: "EASY", category: "math", limit: 2 }
        output: {
            items: [
                {
                    id: "550e8400-e29b-41d4-a716-446655440000"
                    slug: "dos-sumas"
                    title: "Dos Sumas"
                    difficulty: "EASY"
                    categories: ["math"]
                    acceptanceRate: 67.5
                    userStatus: "SOLVED"
                }
                {
                    id: "550e8400-e29b-41d4-a716-446655440001"
                    slug: "suma-de-dos-numeros"
                    title: "Suma de dos números"
                    difficulty: "EASY"
                    categories: ["math"]
                    acceptanceRate: 82.3
                    userStatus: "NOT_ATTEMPTED"
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
                    slug: "busqueda-binaria"
                    title: "Búsqueda Binaria"
                    difficulty: "MEDIUM"
                    categories: ["arrays", "binary-search"]
                    acceptanceRate: 54.1
                }
            ]
            nextCursor: "eyJsYXN0SWQiOiI1NTBlODQwNSJ9"
        }
    }
])
@readonly
@optionalAuth
@http(method: "GET", uri: "/v1/problems", code: 200)
operation ListProblems {
    input := with [PaginatedInput] {
        @documentation("Filtro opcional por dificultad para el catálogo.")
        @httpQuery("difficulty")
        difficulty: Difficulty

        @documentation("Filtro opcional por categoría aplicado al catálogo de problemas.")
        @length(min: 1, max: 64)
        @httpQuery("category")
        category: String

        @documentation("Filtro opcional de progreso del usuario cuando se proporciona un token.")
        @httpQuery("status")
        status: UserProblemStatus
    }

    output := {
        @required
        items: ProblemSummaryList

        nextCursor: Cursor
    }

    errors: [
        InternalServerError
    ]
}

@documentation("Recupera un problema por su identificador, incluyendo casos públicos y el estado opcional del usuario.")
@examples([
    {
        title: "Obtener un problema existente"
        input: { problemId: "550e8400-e29b-41d4-a716-446655440000" }
        output: {
            id: "550e8400-e29b-41d4-a716-446655440000"
            slug: "dos-sumas"
            title: "Dos sumas"
            descriptionMd: "Dado dos enteros, devuelve su suma."
            constraintsMd: "-10^9 <= a, b <= 10^9"
            difficulty: "EASY"
            timeLimitMs: 1000
            memoryLimitMb: 256
            allowedLanguages: ["PYTHON", "TYPESCRIPT"]
            categories: ["math", "arrays"]
            acceptanceRate: 67.5
            testCases: [
                {
                    id: "a1b2c3d4-e5f6-4789-8a0b-1c2d3e4f5061"
                    input: "2 3"
                    expectedOutput: "5"
                    isSample: true
                }
            ]
            userStatus: "SOLVED"
        }
    }
])
@readonly
@optionalAuth
@http(method: "GET", uri: "/v1/problems/{problemId}", code: 200)
operation GetProblem {
    input := {
        @required
        @httpLabel
        problemId: ProblemId

        @httpQuery("allTestCases")
        allTestCases: Boolean
    }

    output: ProblemDetail

    errors: [
        NotFoundError
        InternalServerError
    ]
}

@documentation("Crea una nueva definición de problema con sus casos de ejemplo y ocultos.")
@examples([
    {
        title: "Crear un problema nuevo"
        input: {
            slug: "suma-de-dos-numeros"
            title: "Suma de dos números"
            descriptionMd: "Dado dos enteros, devuelve su suma."
            constraintsMd: "-10^9 <= a, b <= 10^9"
            difficulty: "EASY"
            categories: ["math"]
            timeLimitMs: 1000
            memoryLimitMb: 256
            allowedLanguages: ["PYTHON", "TYPESCRIPT"]
            testCases: [
                {
                    input: "2 3"
                    expectedOutput: "5"
                    isSample: true
                }
                {
                    input: "10 20"
                    expectedOutput: "30"
                    isSample: false
                }
            ]
        }
        output: {
            id: "550e8400-e29b-41d4-a716-446655440001"
            slug: "suma-de-dos-numeros"
            title: "Suma de dos números"
            descriptionMd: "Dado dos enteros, devuelve su suma."
            constraintsMd: "-10^9 <= a, b <= 10^9"
            difficulty: "EASY"
            timeLimitMs: 1000
            memoryLimitMb: 256
            allowedLanguages: ["PYTHON", "TYPESCRIPT"]
            categories: ["math"]
            acceptanceRate: 0.0
            userStatus: "NOT_ATTEMPTED"
        }
    }
])
@requiresScope(
    scopes: ["problems:write"]
)
@http(method: "POST", uri: "/v1/problems", code: 201)
operation CreateProblem {
    input := {
        @documentation("Slug único usado para identificar el problema en las URLs.")
        @required
        @length(min: 3, max: 120)
        slug: String

        @documentation("Título del problema mostrado en la interfaz.")
        @required
        @length(min: 1, max: 160)
        title: String

        @documentation("Enunciado del problema en formato Markdown.")
        @required
        @length(min: 1, max: 50000)
        descriptionMd: String

        @documentation("Restricciones y notas del problema en formato Markdown.")
        @required
        @length(min: 1, max: 10000)
        constraintsMd: String

        @required
        difficulty: Difficulty

        @documentation("Categorías del problema usadas para filtrado y descubrimiento.")
        @required
        @length(min: 1, max: 10)
        categories: StringList

        @documentation("Límite de tiempo de ejecución en milisegundos.")
        @required
        @range(min: 100, max: 10000)
        timeLimitMs: Integer

        @documentation("Límite de memoria en megabytes.")
        @required
        @range(min: 16, max: 1024)
        memoryLimitMb: Integer

        @documentation("Idiomas de programación permitidos para resolver este problema.")
        @required
        @length(min: 1, max: 5)
        allowedLanguages: LanguageList

        @documentation("Casos de prueba enviados al crear el problema. Se esperan al menos uno público y uno oculto.")
        @required
        @length(min: 2, max: 100)
        testCases: TestCaseInputList
    }

    output: ProblemDetail

    errors: [
        ValidationException
        UnauthorizedError
        ForbiddenError
        InternalServerError
    ]
}

@documentation("Actualiza parcialmente la definición existente de un problema.")
@examples([
    {
        title: "Ampliar el límite de tiempo de ejecución"
        input: { problemId: "550e8400-e29b-41d4-a716-446655440000", timeLimitMs: 2000 }
        output: {
            id: "550e8400-e29b-41d4-a716-446655440000"
            slug: "dos-sumas"
            title: "Dos Sumas"
            descriptionMd: "Dado dos enteros, devuelve su suma."
            constraintsMd: "-10^9 <= a, b <= 10^9"
            difficulty: "EASY"
            timeLimitMs: 2000
            memoryLimitMb: 256
            allowedLanguages: ["PYTHON", "TYPESCRIPT"]
            categories: ["math"]
            acceptanceRate: 67.5
        }
    }
    {
        title: "Reemplazar los casos de prueba de un problema"
        input: {
            problemId: "550e8400-e29b-41d4-a716-446655440000"
            testCases: [
                {
                    input: "1 1"
                    expectedOutput: "2"
                    isSample: true
                }
                {
                    input: "-5 5"
                    expectedOutput: "0"
                    isSample: false
                }
            ]
        }
        output: {
            id: "550e8400-e29b-41d4-a716-446655440000"
            slug: "dos-sumas"
            title: "Dos Sumas"
            descriptionMd: "Dado dos enteros, devuelve su suma."
            constraintsMd: "-10^9 <= a, b <= 10^9"
            difficulty: "EASY"
            timeLimitMs: 1000
            memoryLimitMb: 256
            allowedLanguages: ["PYTHON", "TYPESCRIPT"]
            categories: ["math"]
            acceptanceRate: 67.5
        }
    }
])
@requiresScope(
    scopes: ["problems:write"]
)
@http(method: "PATCH", uri: "/v1/problems/{problemId}", code: 200)
operation UpdateProblem {
    input := {
        @required
        @httpLabel
        problemId: ProblemId

        slug: String

        title: String

        descriptionMd: String

        constraintsMd: String

        difficulty: Difficulty

        @documentation("Categorías del problema usadas para filtrado y descubrimiento.")
        @length(min: 1, max: 10)
        categories: StringList

        @documentation("Límite de tiempo de ejecución en milisegundos.")
        @range(min: 100, max: 10000)
        timeLimitMs: Integer

        @documentation("Límite de memoria en megabytes.")
        @range(min: 16, max: 1024)
        memoryLimitMb: Integer

        @documentation("Idiomas de programación permitidos para resolver este problema.")
        @length(min: 1, max: 5)
        allowedLanguages: LanguageList

        @documentation("Indica si el problema está publicado en el catálogo.")
        isPublished: Boolean

        @documentation("Casos de prueba enviados al actualizar la definición del problema.")
        @length(min: 2, max: 100)
        testCases: TestCaseInputList
    }

    output: ProblemDetail

    errors: [
        ValidationException
        NotFoundError
        UnauthorizedError
        ForbiddenError
        InternalServerError
    ]
}

@documentation("Elimina un problema por su identificador mediante borrado lógico, sin quitarlo de la base de datos.")
@examples([
    {
        title: "Eliminar un problema con borrado lógico"
        input: { problemId: "550e8400-e29b-41d4-a716-446655440002" }
    }
])
@requiresScope(
    scopes: ["problems:write"]
)
@idempotent
@http(method: "DELETE", uri: "/v1/problems/{problemId}", code: 204)
operation DeleteProblem {
    input := {
        @required
        @httpLabel
        problemId: ProblemId
    }

    output: Unit

    errors: [
        NotFoundError
        UnauthorizedError
        ForbiddenError
        InternalServerError
    ]
}

@internal
@requiresScope(
    scopes: ["submissions:write"]
)
@http(method: "POST", uri: "/v1/problems/{problemId}/stats", code: 204)
operation RecordSubmissionResult {
    input: RecordSubmissionResultInput
    output: Unit
    errors: [
        NotFoundError
        UnauthorizedError
        ForbiddenError
        InternalServerError
    ]
}

structure RecordSubmissionResultInput {
    @required
    @httpLabel
    problemId: ProblemId

    @required
    accepted: Boolean
}
