$version: "2"

namespace leetcode.shared

use smithy.api#error
use smithy.api#httpError
use smithy.api#trait

string Cursor

@mixin
structure PaginatedInput {
    @httpQuery("cursor")
    cursor: Cursor

    @httpQuery("limit")
    limit: Integer
}

/// String list used by custom traits.
list StringList {
    member: String
}

/// Operation-level authorization scope requirement.
@trait
structure requiresScope {
    @required
    scopes: StringList
}

/// Standard unauthorized response for protected endpoints.
@error("client")
@httpError(401)
structure UnauthorizedError {
    @required
    message: String
}

/// Standard forbidden response when authorization succeeds but access is denied.
@error("client")
@httpError(403)
structure ForbiddenError {
    @required
    message: String
}

@error("client")
@httpError(404)
structure NotFoundError {
    @required
    message: String
}

@error("client")
@httpError(409)
structure ConflictError {
    @required
    message: String
}

/// Standard rate-limit response for request throttling.
@error("client")
@httpError(429)
structure RateLimitError {
    @required
    message: String
}

/// Standard unprocessable entity response for invalid inputs.
@error("client")
@httpError(422)
structure UnprocessableEntityError {
    @required
    message: String
}

@error("server")
@httpError(500)
structure InternalServerError {
    @required
    message: String
}
