$version: "2"

namespace leetcode.executor

use aws.protocols#restJson1
use leetcode.shared#InternalServerError
use smithy.api#documentation
use smithy.api#length
use smithy.api#range
use smithy.framework#ValidationException

@documentation("Servicio interno de ejecución de código. Recibe código fuente, límites y casos de prueba, los ejecuta en un contenedor aislado y devuelve el veredicto. Solo accesible desde otros microservicios (no expuesto en el gateway). Autenticado con EXECUTOR_SHARED_SECRET.")
@title("Executor Service")
@restJson1
service ExecutorApi {
    version: "2026-06-13"
    operations: [
        Execute
    ]
    errors: [
        ValidationException
    ]
}

// ─── IDENTIFICADORES ──────────────────────────────────────────────────────────
@documentation("Identificador UUID del caso de prueba, tal como lo devuelve problems-service.")
@pattern("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
string TestCaseId

// ─── ENUMS ────────────────────────────────────────────────────────────────────
@documentation("Lenguaje de programación del código a ejecutar.")
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

@documentation("Veredicto de la ejecución. El executor nunca emite PENDING; ese estado es exclusivo de submissions-service.")
enum ExecutionStatus {
    @documentation("La solución pasó todos los casos de prueba.")
    ACCEPTED

    @documentation("La salida producida no coincide con la esperada en al menos un caso.")
    WRONG_ANSWER

    @documentation("La ejecución superó el límite de tiempo.")
    TIME_LIMIT_EXCEEDED

    @documentation("La ejecución superó el límite de memoria.")
    MEMORY_LIMIT_EXCEEDED

    @documentation("La ejecución terminó con un error en tiempo de ejecución.")
    RUNTIME_ERROR

    @documentation("El código fuente no pudo compilarse.")
    COMPILATION_ERROR
}

// ─── LISTAS ───────────────────────────────────────────────────────────────────
list TestCaseSpecList {
    member: TestCaseSpec
}

list TestCaseOutcomeList {
    member: TestCaseOutcome
}

// ─── ESTRUCTURAS ──────────────────────────────────────────────────────────────
@documentation("Límites de ejecución aplicados al contenedor.")
structure ExecuteLimits {
    @documentation("Tiempo máximo de ejecución por caso de prueba, en milisegundos.")
    @required
    @range(min: 1, max: 30000)
    timeLimitMs: Integer

    @documentation("Memoria máxima utilizable por el proceso, en megabytes.")
    @required
    @range(min: 1, max: 1024)
    memoryLimitMb: Integer
}

@documentation("Especificación de un caso de prueba que el ejecutor debe evaluar.")
structure TestCaseSpec {
    @documentation("Identificador del caso, tal como se almacena en problems-service. Se incluye en el resultado para correlacionar veredictos.")
    @required
    testCaseId: TestCaseId

    @documentation("Datos de entrada a pasar por stdin al proceso del usuario.")
    @required
    @length(min: 0, max: 20000)
    input: String

    @documentation("Salida esperada por stdout para este caso.")
    @required
    @length(min: 0, max: 20000)
    expectedOutput: String
}

@documentation("Resultado de la ejecución para un caso de prueba individual.")
structure TestCaseOutcome {
    @documentation("Identificador del caso evaluado.")
    @required
    testCaseId: TestCaseId

    @documentation("Veredicto para este caso.")
    @required
    status: ExecutionStatus

    @documentation("Tiempo de ejecución consumido por este caso, en milisegundos.")
    @range(min: 0)
    executionTimeMs: Integer

    @documentation("Memoria utilizada por este caso, en megabytes.")
    @range(min: 0)
    memoryUsageMb: Integer

    @documentation("Salida stdout producida por la solución para este caso (truncada a 20 000 caracteres).")
    @length(min: 0, max: 20000)
    actualOutput: String
}

// ─── OPERACIONES ──────────────────────────────────────────────────────────────
@documentation("Ejecuta el código enviado contra los casos de prueba provistos, dentro de un contenedor aislado, y devuelve el veredicto agregado y por caso. Operación síncrona: el caller debe esperar hasta obtener la respuesta.")
@http(method: "POST", uri: "/v1/execute", code: 200)
operation Execute {
    input := {
        @required
        language: Language

        @documentation("Código fuente a ejecutar (máx. 64 KB).")
        @required
        @length(min: 1, max: 65536)
        code: String

        @required
        limits: ExecuteLimits

        @documentation("Lista de casos de prueba a evaluar. Debe tener al menos un elemento.")
        @required
        @length(min: 1, max: 500)
        testCases: TestCaseSpecList
    }

    output := {
        @documentation("Veredicto agregado de la ejecución.")
        @required
        status: ExecutionStatus

        @documentation("Tiempo de ejecución total (máximo entre casos), en milisegundos.")
        @range(min: 0)
        timeMs: Integer

        @documentation("Memoria total utilizada (máximo entre casos), en megabytes.")
        @range(min: 0)
        memoryMb: Integer

        @documentation("Mensaje de error de compilación o ejecución, cuando aplica.")
        @length(min: 0, max: 10000)
        errorMessage: String

        @documentation("Resultados individuales por caso de prueba.")
        @required
        testCaseResults: TestCaseOutcomeList
    }

    errors: [
        ValidationException
        InternalServerError
    ]
}
