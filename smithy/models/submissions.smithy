$version: "2"

namespace leetcode.submissions

use aws.protocols#restJson1
use leetcode.shared#Cursor
use leetcode.shared#ForbiddenError
use leetcode.shared#InternalServerError
use leetcode.shared#NotFoundError
use leetcode.shared#PaginatedInput
use leetcode.shared#RateLimitError
use leetcode.shared#UnauthorizedError
use leetcode.shared#UnprocessableEntityError
use leetcode.shared#requiresScope
use smithy.api#documentation
use smithy.api#examples
use smithy.api#httpBearerAuth
use smithy.api#length
use smithy.api#pattern
use smithy.api#range
use smithy.framework#ValidationException

@documentation("Servicio de envíos de código: ejecución contra casos públicos, evaluación asíncrona contra casos ocultos e historial del usuario autenticado (RF1, RF5).")
@title("Submissions Service")
@httpBearerAuth
@restJson1
@paginated(inputToken: "cursor", outputToken: "nextCursor", pageSize: "limit")
service SubmissionsApi {
    version: "2026-06-13"
    resources: [
        Submission
    ]
    errors: [
        ValidationException
    ]
}

// ─── IDENTIFICADORES ────────────────────────────────────────────────────────
@documentation("Identificador UUID único del envío.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string SubmissionId

@documentation("Identificador UUID del problema al que pertenece el envío.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string ProblemId

@documentation("Identificador UUID del usuario propietario del envío.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string UserId

@documentation("Identificador UUID del contest en el que se realizó el envío, cuando aplica.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string ContestId

@documentation("Identificador del caso de prueba evaluado por el juez.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string TestCaseId

// ─── ENUMS ────────────────────────────────────────────────────────────────────
@documentation("Lenguaje de programación en el que se envía la solución.")
enum Language {
    @documentation("C++17.")
    CPP

    @documentation("Java (versión LTS más reciente soportada por el juez).")
    JAVA

    @documentation("Python 3.")
    PYTHON

    @documentation("JavaScript (Node.js LTS).")
    JAVASCRIPT

    @documentation("TypeScript (compilado con tsc antes de ejecutarse en Node.js LTS).")
    TYPESCRIPT
}

@documentation("Estado de evaluación de un envío o de un caso de prueba individual. PENDING indica que el juez aún no ha terminado; el resto son veredictos finales.")
enum SubmissionStatus {
    @documentation("El envío está en cola o en proceso de evaluación; el veredicto aún no está disponible.")
    PENDING

    @documentation("La solución pasó todos los casos de prueba.")
    ACCEPTED

    @documentation("La salida producida no coincide con la salida esperada en al menos un caso.")
    WRONG_ANSWER

    @documentation("La ejecución superó el límite de tiempo permitido por el problema.")
    TIME_LIMIT_EXCEEDED

    @documentation("La ejecución superó el límite de memoria permitido por el problema.")
    MEMORY_LIMIT_EXCEEDED

    @documentation("La ejecución terminó con un error en tiempo de ejecución.")
    RUNTIME_ERROR

    @documentation("El código fuente no pudo compilarse.")
    COMPILATION_ERROR
}

// ─── LISTAS ───────────────────────────────────────────────────────────────────
@documentation("Colección paginada con resúmenes de envíos para el historial.")
list SubmissionSummaryList {
    member: SubmissionSummary
}

@documentation("Colección de resultados por caso de prueba asociados a un envío.")
list TestCaseResultList {
    member: TestCaseResult
}

// ─── ESTRUCTURAS ──────────────────────────────────────────────────────────────
@documentation("Resultado síncrono de una ejecución contra los casos públicos del problema, sin persistencia.")
structure RunCodeResult {
    @documentation("Veredicto final de la ejecución síncrona.")
    @required
    status: SubmissionStatus

    @documentation("Tiempo de ejecución total de la ejecución, en milisegundos.")
    @range(min: 0)
    timeMs: Integer

    @documentation("Memoria total utilizada por la ejecución, en megabytes.")
    @range(min: 0)
    memoryMb: Integer

    @documentation("Mensaje de error de compilación o ejecución, cuando aplica.")
    @length(min: 0, max: 10000)
    errorMessage: String

    @documentation("Resultados por caso de prueba para los casos públicos evaluados.")
    testCaseResults: TestCaseResultList
}

@documentation("Resultado de la evaluación de un envío contra un caso de prueba concreto.")
structure TestCaseResult {
    @documentation("Identificador del caso de prueba evaluado.")
    @required
    testCaseId: TestCaseId

    @documentation("Veredicto del juez para este caso de prueba.")
    @required
    status: SubmissionStatus

    @documentation("Tiempo de ejecución consumido por este caso, en milisegundos.")
    @range(min: 0)
    executionTimeMs: Integer

    @documentation("Memoria utilizada por este caso, en megabytes.")
    @range(min: 0)
    memoryUsageMb: Integer

    @documentation("Salida producida por la solución para este caso. Solo se expone para casos públicos.")
    @length(min: 0, max: 20000)
    actualOutput: String
}

@documentation("Resumen compacto de un envío usado en la vista de historial.")
structure SubmissionSummary {
    @required
    id: SubmissionId

    @required
    problemId: ProblemId

    @documentation("Usuario propietario del envío.")
    @required
    userId: UserId

    @documentation("Contest asociado al envío; ausente para envíos fuera de un contest.")
    contestId: ContestId

    @required
    language: Language

    @required
    status: SubmissionStatus

    @documentation("Tiempo de ejecución total del envío en milisegundos. Ausente mientras el envío esté PENDING.")
    @range(min: 0)
    timeMs: Integer

    @documentation("Memoria total utilizada por el envío en megabytes. Ausente mientras el envío esté PENDING.")
    @range(min: 0)
    memoryMb: Integer

    @documentation("Instante de creación del envío en formato ISO 8601.")
    @required
    submittedAt: Timestamp

    @documentation("Instante en que el juez emitió el veredicto, en formato ISO 8601. Ausente mientras el envío esté PENDING.")
    judgedAt: Timestamp
}

@documentation("Detalle completo de un envío, incluyendo el código fuente y los resultados por caso de prueba.")
structure SubmissionDetail {
    @required
    id: SubmissionId

    @required
    problemId: ProblemId

    @documentation("Usuario propietario del envío.")
    @required
    userId: UserId

    @documentation("Contest asociado al envío; ausente para envíos fuera de un contest.")
    contestId: ContestId

    @required
    language: Language

    @documentation("Código fuente enviado por el usuario.")
    @required
    @length(min: 1, max: 65536)
    code: String

    @required
    status: SubmissionStatus

    @documentation("Tiempo de ejecución total del envío en milisegundos. Ausente mientras el envío esté PENDING.")
    @range(min: 0)
    timeMs: Integer

    @documentation("Memoria total utilizada por el envío en megabytes. Ausente mientras el envío esté PENDING.")
    @range(min: 0)
    memoryMb: Integer

    @documentation("Mensaje de error de compilación o ejecución. Presente solo cuando el veredicto es un error.")
    @length(min: 0, max: 10000)
    errorMessage: String

    @documentation("Instante de creación del envío en formato ISO 8601.")
    @required
    submittedAt: Timestamp

    @documentation("Instante en que el juez emitió el veredicto, en formato ISO 8601. Ausente mientras el envío esté PENDING.")
    judgedAt: Timestamp

    @documentation("Resultados por caso de prueba. En modo Run solo incluye casos públicos; en modo Submit incluye todos los casos evaluados.")
    testCaseResults: TestCaseResultList
}

// ─── RECURSOS ───────────────────────────────────────────────────────────────
@documentation("Un envío de código de un usuario para un problema, evaluado de forma asíncrona por el juez.")
resource Submission {
    identifiers: {
        submissionId: SubmissionId
    }
    read: GetSubmission
    list: ListSubmissions
    create: Submit
    collectionOperations: [
        RunCode
    ]
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
@documentation("Modo \"Run\": ejecuta la solución de forma síncrona únicamente contra los casos públicos del problema, sin persistirla en la base de datos ni en el historial oficial. Devuelve el veredicto final inmediatamente, útil para validar la solución antes de hacer un Submit.")
@examples([
    {
        title: "Ejecutar una solución contra los casos públicos"
        input: { problemId: "550e8400-e29b-41d4-a716-446655440000", language: "PYTHON", code: "print(sum(map(int, input().split())))" }
        output: {
            status: "ACCEPTED"
            timeMs: 18
            memoryMb: 12
            testCaseResults: [
                {
                    testCaseId: "a1b2c3d4-e5f6-4789-8a0b-1c2d3e4f5061"
                    status: "ACCEPTED"
                    executionTimeMs: 18
                    memoryUsageMb: 12
                    actualOutput: "5"
                }
            ]
        }
    }
])
@requiresScope(
    scopes: ["submissions:write"]
)
@http(method: "POST", uri: "/v1/submissions/run", code: 200)
operation RunCode {
    input := {
        @documentation("Problema contra el que se ejecuta la solución.")
        @required
        problemId: ProblemId

        @required
        language: Language

        @documentation("Código fuente a ejecutar (máx. 64 KB).")
        @required
        @length(min: 1, max: 65536)
        code: String
    }

    output: RunCodeResult

    errors: [
        ValidationException
        UnauthorizedError
        ForbiddenError
        RateLimitError
        UnprocessableEntityError
        InternalServerError
    ]
}

@documentation("Modo \"Submit\": ejecuta la solución contra los casos públicos y ocultos y la persiste en el historial del usuario. La evaluación es asíncrona; el envío comienza en estado PENDING.")
@examples([
    {
        title: "Enviar una solución para evaluación oficial"
        input: { problemId: "550e8400-e29b-41d4-a716-446655440000", language: "PYTHON", code: "print(sum(map(int, input().split())))" }
        output: { submissionId: "7c9e6679-7425-40de-944b-e07fc1f90ae7", status: "PENDING" }
    }
    {
        title: "Enviar una solución como parte de un contest"
        input: { problemId: "550e8400-e29b-41d4-a716-446655440000", contestId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", language: "CPP", code: "#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b;}" }
        output: { submissionId: "9b2f5a1c-1f3e-4a2d-8c7b-6e5d4c3b2a10", status: "PENDING" }
    }
])
@requiresScope(
    scopes: ["submissions:write"]
)
@http(method: "POST", uri: "/v1/submissions", code: 202)
operation Submit {
    input := {
        @documentation("Problema que se intenta resolver.")
        @required
        problemId: ProblemId

        @documentation("Contest al que pertenece el envío. Presente solo si el envío forma parte de un contest.")
        contestId: ContestId

        @required
        language: Language

        @documentation("Código fuente a evaluar (máx. 64 KB).")
        @required
        @length(min: 1, max: 65536)
        code: String
    }

    output := {
        @documentation("Identificador del envío persistido. Permite consultar su estado y detalle mediante GetSubmission.")
        @required
        submissionId: SubmissionId

        @documentation("Estado inicial del envío; PENDING hasta que el juez emite el veredicto.")
        @required
        status: SubmissionStatus
    }

    errors: [
        ValidationException
        UnauthorizedError
        ForbiddenError
        RateLimitError
        UnprocessableEntityError
        InternalServerError
    ]
}

@documentation("Lista los envíos del usuario autenticado, ordenados del más reciente al más antiguo, con filtros opcionales por problema, contest o estado. El propietario se deriva del token; no se aceptan envíos de otros usuarios.")
@examples([
    {
        title: "Primera página del historial del usuario para un problema"
        input: { problemId: "550e8400-e29b-41d4-a716-446655440000", limit: 2 }
        output: {
            items: [
                {
                    id: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
                    problemId: "550e8400-e29b-41d4-a716-446655440000"
                    userId: "1d8e8a02-3b4c-4d5e-9f60-7a8b9c0d1e2f"
                    language: "PYTHON"
                    status: "ACCEPTED"
                    timeMs: 42
                    memoryMb: 18
                    submittedAt: "2026-06-13T10:15:30Z"
                    judgedAt: "2026-06-13T10:15:32Z"
                }
                {
                    id: "9b2f5a1c-1f3e-4a2d-8c7b-6e5d4c3b2a10"
                    problemId: "550e8400-e29b-41d4-a716-446655440000"
                    userId: "1d8e8a02-3b4c-4d5e-9f60-7a8b9c0d1e2f"
                    language: "PYTHON"
                    status: "WRONG_ANSWER"
                    timeMs: 39
                    memoryMb: 17
                    submittedAt: "2026-06-13T09:50:11Z"
                    judgedAt: "2026-06-13T09:50:13Z"
                }
            ]
            nextCursor: "eyJsYXN0SWQiOiI5YjJmNWExYyJ9"
        }
    }
])
@requiresScope(
    scopes: ["submissions:read"]
)
@readonly
@http(method: "GET", uri: "/v1/submissions", code: 200)
operation ListSubmissions {
    input := with [PaginatedInput] {
        @documentation("Filtro opcional por problema.")
        @httpQuery("problemId")
        problemId: ProblemId

        @documentation("Filtro opcional por contest.")
        @httpQuery("contestId")
        contestId: ContestId

        @documentation("Filtro opcional por estado o veredicto del envío.")
        @httpQuery("status")
        status: SubmissionStatus
    }

    output := {
        @documentation("Envíos de la página actual.")
        @required
        items: SubmissionSummaryList

        @documentation("Cursor para solicitar la siguiente página. Ausente cuando no hay más resultados.")
        nextCursor: Cursor
    }

    errors: [
        ValidationException
        UnauthorizedError
        ForbiddenError
        InternalServerError
    ]
}

@documentation("Recupera el detalle completo de un envío por su identificador, incluyendo el código fuente y los resultados por caso de prueba. Solo el propietario del envío puede consultarlo. Se recomienda hacer polling (~1 s) mientras el estado sea PENDING.")
@examples([
    {
        title: "Obtener el detalle de un envío ya evaluado"
        input: { submissionId: "9b2f5a1c-1f3e-4a2d-8c7b-6e5d4c3b2a10" }
        output: {
            id: "9b2f5a1c-1f3e-4a2d-8c7b-6e5d4c3b2a10"
            problemId: "550e8400-e29b-41d4-a716-446655440000"
            userId: "1d8e8a02-3b4c-4d5e-9f60-7a8b9c0d1e2f"
            language: "PYTHON"
            code: "print(sum(map(int, input().split())))"
            status: "WRONG_ANSWER"
            timeMs: 39
            memoryMb: 17
            submittedAt: "2026-06-13T09:50:11Z"
            judgedAt: "2026-06-13T09:50:13Z"
            testCaseResults: [
                {
                    testCaseId: "a1b2c3d4-e5f6-4789-8a0b-1c2d3e4f5061"
                    status: "ACCEPTED"
                    executionTimeMs: 12
                    memoryUsageMb: 17
                    actualOutput: "5"
                }
                {
                    testCaseId: "a1b2c3d4-e5f6-4789-8a0b-1c2d3e4f5062"
                    status: "WRONG_ANSWER"
                    executionTimeMs: 39
                    memoryUsageMb: 17
                    actualOutput: "0"
                }
            ]
        }
    }
])
@requiresScope(
    scopes: ["submissions:read"]
)
@readonly
@http(method: "GET", uri: "/v1/submissions/{submissionId}", code: 200)
operation GetSubmission {
    input := {
        @required
        @httpLabel
        submissionId: SubmissionId
    }

    output: SubmissionDetail

    errors: [
        UnauthorizedError
        ForbiddenError
        NotFoundError
        InternalServerError
    ]
}
