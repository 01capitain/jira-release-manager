# Release Client REST Endpoints

This page summarises the REST endpoints used by the release management UI. Refer to `openapi.yaml` for the canonical schema and pagination contracts.

## Release Versions
- `GET /release-versions/new-values` — fetch default name and release track for new releases (authenticated). Response: `{ name: string; releaseTrack: ReleaseTrack }`.
- `GET /release-versions` — paginated list of release versions (`PaginatedResponse<ReleaseVersionDto>`). Supports `page`, `pageSize`, `sortBy` (`createdAt` | `name`, prefix with `-` for descending), and repeatable `relations` (e.g. `relations=patches` to include patches).
- `POST /release-versions` — create a release version. Body: `ReleaseVersionCreateInput` (name optional; releaseTrack optional). Response: `ReleaseVersionDto`.
- `PATCH /release-versions/{releaseId}` — update release name and/or track. Body: `ReleaseVersionUpdateInput` (at least one field). Response: `ReleaseVersionDto`.

## Patches
- `GET /release-versions/{releaseId}/patches` — patches for a given release.
- `POST /release-versions/{releaseId}/patches` — create a patch. Body: `PatchCreateInput` (must include matching `versionId`).
- `GET /patches/{patchId}/default-selection` — component selection defaults when preparing a successor patch.
- `GET /patches/{patchId}/component-versions` — component versions associated with a patch.
- `POST /patches/{patchId}/successor` — arrange successor patch components. Body: `{ patchId, selectedReleaseComponentIds[] }`. Returns summary plus updated status/history.
- Transition endpoints remain under `/release-versions/{releaseId}/patches/{patchId}/<action>` (`start-deployment`, `cancel-deployment`, `mark-active`, `revert-to-deployment`, `deprecate`, `reactivate`).
- Patch status is supplied via `currentStatus` on each patch returned by `GET /release-versions` (with `relations=patches`); no standalone status endpoint is required.

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
