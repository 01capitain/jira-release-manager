# Release Client REST Endpoints

This page summarises the REST endpoints used by the release management UI. Refer to `openapi.yaml` for the canonical schema and pagination contracts.

## Release Versions
- `GET /release-versions` — paginated list of release versions (`PaginatedResponse<ReleaseVersionDto>`). Supports `page`, `pageSize`, and `sortBy` (`createdAt` | `name`, prefix with `-` for descending).
- `POST /release-versions` — create a release version. Body: `ReleaseVersionCreateInput`. Response: `ReleaseVersionDto`.
- `GET /release-versions/with-builds` — list release versions with their built versions attached. Response: `ReleaseVersionWithBuildsDto[]`.

## Built Versions
- `GET /release-versions/{releaseId}/built-versions` — built versions for a given release.
- `POST /release-versions/{releaseId}/built-versions` — create a built version. Body: `BuiltVersionCreateInput` (must include matching `versionId`).
- `GET /built-versions/{builtId}/status` — current status and history for a built version.
- `GET /built-versions/{builtId}/default-selection` — component selection defaults when preparing a successor build.
- `GET /built-versions/{builtId}/component-versions` — component versions associated with a built version.
- `POST /built-versions/{builtId}/successor` — arrange successor built components. Body: `{ builtVersionId, selectedReleaseComponentIds[] }`. Returns summary plus updated status/history.
- Transition endpoints remain under `/release-versions/{releaseId}/built-versions/{builtId}/<action>` (`start-deployment`, `cancel-deployment`, `mark-active`, `revert-to-deployment`, `deprecate`, `reactivate`).

## Jira Setup
- `GET /jira/setup/config` — expose the configured base URL and project key.
- `GET /jira/setup/credentials` — fetch the current user’s stored Jira credentials (`{ email, hasToken }`).
- `POST /jira/setup/credentials` — store/update credentials. Body: `{ email, apiToken? }`.
- `POST /jira/setup/verify` — verify connectivity to Jira (`{ email, apiToken? }`).
- `GET /jira/setup/status` — readiness check (`{ ok: boolean, reason?: string }`).

## Jira Releases
- `GET /jira/releases/stored` — list stored Jira versions (supports `includeReleased`, `includeUnreleased`, `includeArchived`, `page`, `pageSize`).
- `POST /jira/releases/sync` — sync versions from Jira. Body: optional filters matching the list query; response `{ saved: number }`.

All error responses follow the shared `RestError` envelope. Use `RestApiError` helpers on the client to surface messages consistently.
