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
use smithy.api#httpBearerAuth
use smithy.api#optionalAuth
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

string ProblemId

// ─── ENUMS ────────────────────────────────────────────────────────────────────
enum Difficulty {
    EASY
    MEDIUM
    HARD
}

enum Language {
    PYTHON
    JAVA
    CPP
    JAVASCRIPT
    TYPESCRIPT
}

enum UserProblemStatus {
    NOT_ATTEMPTED
    ATTEMPTED
    SOLVED
}

// ─── LISTAS ───────────────────────────────────────────────────────────────────
list LanguageList {
    member: Language
}

list ProblemSummaryList {
    member: ProblemSummary
}

list TestCaseInputList {
    member: TestCaseInput
}

list TestCaseOutputList {
    member: TestCaseOutput
}

// ─── ESTRUCTURAS ──────────────────────────────────────────────────────────────
/// Caso de prueba enviado al crear/editar un problema
structure TestCaseInput {
    @required
    input: String

    @required
    expectedOutput: String

    /// true = visible para el usuario; false = oculto (solo para evaluación)
    @required
    isSample: Boolean
}

structure TestCaseOutput {
    @required
    input: String

    @required
    expectedOutput: String
}

structure ProblemDetail {
    @required
    id: ProblemId

    @required
    slug: String

    @required
    title: String

    @required
    descriptionMd: String

    @required
    constrainsMd: String

    @required
    difficulty: Difficulty

    @required
    timeLimitMs: Integer

    @required
    memoryLimitMb: Integer

    @required
    allowedLanguages: LanguageList

    @required
    categories: StringList

    @required
    acceptanceRate: Float

    publicTestCases: TestCaseOutputList

    userStatus: UserProblemStatus
}

/// Resumen para el listado del catálogo
structure ProblemSummary {
    @required
    id: ProblemId

    @required
    slug: String

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
    myStatus: UserProblemStatus
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
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
@readonly
@optionalAuth
@http(method: "GET", uri: "/v1/problems", code: 200)
operation ListProblems {
    input := with [PaginatedInput] {
        @httpQuery("difficulty")
        difficulty: Difficulty

        @httpQuery("category")
        category: String

        /// Solo aplica con token de usuario; ignorado si es anónimo
        @httpQuery("status")
        status: UserProblemStatus
    }

    output := {
        @required
        items: ProblemSummaryList

        @required
        nextCursor: Cursor
    }

    errors: [
        InternalServerError
    ]
}

@readonly
@optionalAuth
@http(method: "GET", uri: "/v1/problems/{problemId}", code: 200)
operation GetProblem {
    input := {
        @required
        @httpLabel
        problemId: ProblemId
    }

    output: ProblemDetail

    errors: [
        NotFoundError
        InternalServerError
    ]
}

@http(method: "POST", uri: "/v1/problems", code: 201)
operation CreateProblem {
    input := {
        @required
        slug: String

        @required
        title: String

        @required
        descriptionMd: String

        @required
        constraintsMd: String

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
        allowedLanguages: LanguageList

        /// Debe incluir al menos un caso público y uno oculto
        @required
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

@idempotent
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

        categories: StringList

        timeLimitMs: Integer

        memoryLimitMb: Integer

        allowedLanguages: LanguageList

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
