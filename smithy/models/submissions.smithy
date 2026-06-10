$version: "2.0"

namespace com.leetcode.submissions

use aws.protocols#restJson1
use smithy.framework#ValidationException

/// Servicio de envíos de código, evaluación asíncrona e historial (RF1, RF5)
@title("Submissions Service")
@restJson1
service SubmissionsService {
    version: "2024-01-01"
    operations: [
        RunCode
        Submit
        GetSubmission
        ListSubmissions
        GetSubmissionCode
    ]
    errors: [
        ValidationException
    ]
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────
enum Language {
    PYTHON = "PYTHON"
    JAVA = "JAVA"
    CPP = "CPP"
    JAVASCRIPT = "JAVASCRIPT"
    TYPESCRIPT = "TYPESCRIPT"
}

enum SubmissionStatus {
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    DONE = "DONE"
}

enum Verdict {
    AC = "AC"
    WA = "WA"
    TLE = "TLE"
    MLE = "MLE"
    RE = "RE"
    CE = "CE"
}

// ─── ESTRUCTURAS ──────────────────────────────────────────────────────────────
/// Resumen de un envío para el historial
structure SubmissionSummary {
    @required
    id: String

    @required
    problemId: String

    @required
    userId: String

    @required
    language: Language

    @required
    status: SubmissionStatus

    verdict: Verdict

    runtimeMs: Integer

    memoryKb: Integer

    @required
    createdAt: String
}

list SubmissionList {
    member: SubmissionSummary
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
/// Modo "Run": ejecuta solo casos públicos, no persiste en historial oficial
@http(method: "POST", uri: "/v1/submissions/run", code: 202)
operation RunCode {
    input := {
        @required
        problemId: String

        @required
        language: Language

        /// Código fuente (máx. 64 KB)
        @required
        sourceCode: String
    }

    output := {
        @required
        submissionId: String

        @required
        status: SubmissionStatus
    }

    errors: [
        UnauthorizedError
        RateLimitError
        UnprocessableEntityError
    ]
}

/// Modo "Submit": ejecuta casos públicos + ocultos, persiste en historial
@http(method: "POST", uri: "/v1/submissions", code: 202)
operation Submit {
    input := {
        @required
        problemId: String

        @required
        language: Language

        @required
        sourceCode: String

        /// Presente solo si el envío es parte de un contest
        contestId: String
    }

    output := {
        @required
        submissionId: String

        @required
        status: SubmissionStatus
    }

    errors: [
        UnauthorizedError
        RateLimitError
        UnprocessableEntityError
    ]
}

/// Polling ~1 s mientras status sea QUEUED o RUNNING
@readonly
@http(method: "GET", uri: "/v1/submissions/{submissionId}")
operation GetSubmission {
    input := {
        @required
        @httpLabel
        submissionId: String
    }

    output := {
        @required
        id: String

        @required
        problemId: String

        @required
        userId: String

        @required
        language: Language

        @required
        status: SubmissionStatus

        verdict: Verdict

        runtimeMs: Integer

        memoryKb: Integer

        failedTestCaseIndex: Integer

        compileError: String

        @required
        createdAt: String
    }

    errors: [
        UnauthorizedError
        ForbiddenError
        SubmissionNotFoundError
    ]
}

/// Historial de envíos con filtros opcionales
@readonly
@http(method: "GET", uri: "/v1/submissions")
operation ListSubmissions {
    input := {
        @httpQuery("problemId")
        problemId: String

        @httpQuery("userId")
        userId: String

        @httpQuery("verdict")
        verdict: Verdict

        @httpQuery("page")
        page: Integer

        @httpQuery("pageSize")
        pageSize: Integer
    }

    output := {
        @required
        items: SubmissionList

        @required
        total: Integer

        @required
        page: Integer
    }

    errors: [
        UnauthorizedError
    ]
}

/// Retorna el código fuente de un envío (RF5)
@readonly
@http(method: "GET", uri: "/v1/submissions/{submissionId}/code")
operation GetSubmissionCode {
    input := {
        @required
        @httpLabel
        submissionId: String
    }

    output := {
        @required
        sourceCode: String

        @required
        language: Language
    }

    errors: [
        UnauthorizedError
        ForbiddenError
        SubmissionNotFoundError
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
@httpError(403)
structure ForbiddenError {
    @required
    message: String
}

@error("client")
@httpError(404)
structure SubmissionNotFoundError {
    @required
    message: String
}

@error("client")
@httpError(422)
structure UnprocessableEntityError {
    @required
    message: String
}

@error("client")
@httpError(429)
structure RateLimitError {
    @required
    message: String
}
