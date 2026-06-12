$version: "2"

namespace leetcode.shared

use smithy.api#documentation
use smithy.api#error
use smithy.api#httpError
use smithy.api#length
use smithy.api#range
use smithy.api#trait

@documentation("Cursor opaco de paginación devuelto por la API para continuar la consulta.")
@length(min: 1, max: 512)
string Cursor

@mixin
structure PaginatedInput {
    @documentation("Cursor opaco de la página anterior para navegar entre resultados paginados.")
    @httpQuery("cursor")
    cursor: Cursor

    @documentation("Número máximo de elementos a devolver en una sola página.")
    @range(min: 1, max: 100)
    @httpQuery("limit")
    limit: Integer
}

@documentation("Lista de cadenas de uso general empleada en filtros, categorías y definición de scopes.")
list StringList {
    member: String
}

@documentation("Trait personalizado que declara los scopes OAuth requeridos para invocar una operación. El servidor debe rechazar con 403 si el token no incluye al menos uno de los scopes listados.")
@trait
structure requiresScope {
    @required
    @documentation("Lista de scopes OAuth aceptados. Basta con que el token del cliente incluya uno de ellos.")
    scopes: StringList
}

@documentation("Devuelto cuando el cliente no está autenticado.")
@error("client")
@httpError(401)
structure UnauthorizedError {
    @required
    @documentation("Mensaje legible de error de autenticación.")
    @length(min: 1, max: 1000)
    message: String
}

@documentation("Devuelto cuando el cliente está autenticado pero no posee el alcance o rol requerido.")
@error("client")
@httpError(403)
structure ForbiddenError {
    @required
    @documentation("Mensaje legible de error de autorización.")
    @length(min: 1, max: 1000)
    message: String
}

@documentation("Devuelto cuando el recurso solicitado no existe.")
@error("client")
@httpError(404)
structure NotFoundError {
    @required
    @documentation("Mensaje legible de error cuando no se encuentra el recurso.")
    @length(min: 1, max: 1000)
    message: String
}

@documentation("Devuelto cuando la solicitud entra en conflicto con el estado actual del recurso (p. ej. slug duplicado, recurso ya eliminado).")
@error("client")
@httpError(409)
structure ConflictError {
    @required
    @documentation("Descripción legible del conflicto detectado.")
    @length(min: 1, max: 1000)
    message: String
}

@documentation("Devuelto cuando el cliente supera el límite de peticiones permitido en la ventana de tiempo configurada.")
@error("client")
@httpError(429)
structure RateLimitError {
    @required
    @documentation("Mensaje legible indicando el límite alcanzado y, opcionalmente, cuándo puede reintentar.")
    @length(min: 1, max: 1000)
    message: String
}

@documentation("Devuelto cuando el cuerpo o los parámetros de la solicitud son semánticamente inválidos y no pueden procesarse aunque estén bien formados.")
@error("client")
@httpError(422)
structure UnprocessableEntityError {
    @required
    @documentation("Descripción legible del error de validación semántica.")
    @length(min: 1, max: 1000)
    message: String
}

@documentation("Devuelto cuando ocurre un error interno inesperado del servicio.")
@error("server")
@httpError(500)
structure InternalServerError {
    @required
    @documentation("Mensaje legible de error interno del servicio.")
    @length(min: 1, max: 1000)
    message: String
}
