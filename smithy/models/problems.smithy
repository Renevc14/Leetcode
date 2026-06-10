$version: "2.0"

namespace com.leetcode.problems

use aws.protocols#restJson1
use smithy.framework#ValidationException

/// Servicio de gestión del catálogo de problemas (RF2, RF3)
@title("Problems Service")
@restJson1
service ProblemsService {
    version: "2024-01-01"
    operations: [
        ListProblems
        GetProblem
        CreateProblem
        UpdateProblem
        DisableProblem
    ]
    errors: [
        ValidationException
    ]
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────
enum Difficulty {
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
}

enum Language {
    PYTHON = "python"
    JAVA = "java"
    CPP = "cpp"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
}

enum MyStatus {
    UNSOLVED = "unsolved"
    ATTEMPTED = "attempted"
    SOLVED = "solved"
}

// ─── LISTAS ───────────────────────────────────────────────────────────────────
list StringList {
    member: String
}

list LanguageList {
    member: Language
}

list ProblemSummaryList {
    member: ProblemSummary
}

list PublicTestCaseList {
    member: PublicTestCase
}

list TestCaseInputList {
    member: TestCaseInput
}

// ─── ESTRUCTURAS ──────────────────────────────────────────────────────────────
/// Par entrada/salida pública (visible en el editor)
structure PublicTestCase {
    @required
    input: String

    @required
    expectedOutput: String
}

/// Caso de prueba enviado al crear/editar un problema
structure TestCaseInput {
    @required
    input: String

    @required
    expectedOutput: String

    /// true = visible para el usuario; false = oculto (solo para evaluación)
    @required
    isPublic: Boolean
}

/// Resumen para el listado del catálogo
structure ProblemSummary {
    @required
    id: String

    @required
    title: String

    @required
    difficulty: Difficulty

    @required
    categories: StringList

    /// Porcentaje 0-100 calculado sobre total de envíos
    @required
    acceptanceRate: Float

    /// Solo presente cuando el request lleva token de usuario autenticado
    myStatus: MyStatus
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
/// RF2: Listar y filtrar el catálogo (acceso anónimo permitido)
@readonly
@http(method: "GET", uri: "/v1/problems")
operation ListProblems {
    input := {
        @httpQuery("difficulty")
        difficulty: Difficulty

        @httpQuery("category")
        category: String

        /// Solo aplica con token de usuario; ignorado si es anónimo
        @httpQuery("status")
        status: MyStatus

        @httpQuery("page")
        page: Integer

        @httpQuery("pageSize")
        pageSize: Integer
    }

    output := {
        @required
        items: ProblemSummaryList

        @required
        total: Integer

        @required
        page: Integer
    }
}

/// RF2: Obtener detalle de un problema — nunca devuelve casos ocultos
@readonly
@http(method: "GET", uri: "/v1/problems/{problemId}")
operation GetProblem {
    input := {
        @required
        @httpLabel
        problemId: String
    }

    output := {
        @required
        id: String

        @required
        title: String

        @required
        difficulty: Difficulty

        @required
        categories: StringList

        @required
        acceptanceRate: Float

        myStatus: MyStatus

        @required
        statementMarkdown: String

        @required
        constraints: String

        @required
        timeLimitMs: Integer

        @required
        memoryLimitMb: Integer

        @required
        allowedLanguages: LanguageList

        /// Solo casos públicos — los ocultos nunca se exponen vía API
        @required
        publicTestCases: PublicTestCaseList
    }

    errors: [
        ProblemNotFoundError
    ]
}

/// RF3: Crear problema — requiere scope problems:write (SETTER, ADMIN)
@http(method: "POST", uri: "/v1/problems", code: 201)
operation CreateProblem {
    input := {
        @required
        title: String

        @required
        statementMarkdown: String

        @required
        constraints: String

        @required
        difficulty: Difficulty

        @required
        categories: StringList

        /// Entre 100 y 10000 ms
        @required
        timeLimitMs: Integer

        /// Entre 16 y 1024 MB
        @required
        memoryLimitMb: Integer

        @required
        allowedLanguages: StringList

        /// Debe incluir al menos un caso público y uno oculto
        @required
        testCases: TestCaseInputList
    }

    output := {
        @required
        id: String
    }

    errors: [
        ForbiddenError
        UnauthorizedError
    ]
}

/// RF3: Editar problema existente — requiere scope problems:write
@idempotent
@http(method: "PUT", uri: "/v1/problems/{problemId}")
operation UpdateProblem {
    input := {
        @required
        @httpLabel
        problemId: String

        title: String

        statementMarkdown: String

        constraints: String

        difficulty: Difficulty

        categories: StringList

        timeLimitMs: Integer

        memoryLimitMb: Integer

        allowedLanguages: StringList

        testCases: TestCaseInputList
    }

    output := {
        @required
        id: String
    }

    errors: [
        ProblemNotFoundError
        ForbiddenError
        UnauthorizedError
    ]
}

/// RF3: Deshabilitar problema (soft delete) — requiere scope problems:write
@idempotent
@http(method: "PATCH", uri: "/v1/problems/{problemId}/disable")
operation DisableProblem {
    input := {
        @required
        @httpLabel
        problemId: String
    }

    output := {
        @required
        message: String
    }

    errors: [
        ProblemNotFoundError
        ForbiddenError
        UnauthorizedError
    ]
}

// ─── ERRORES ──────────────────────────────────────────────────────────────────
@error("client")
@httpError(404)
structure ProblemNotFoundError {
    @required
    message: String
}

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
