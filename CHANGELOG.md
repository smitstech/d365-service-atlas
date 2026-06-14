# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — note that Chrome Web Store accepts up to 4-part versions, so the `manifest.json` `version` may have a fourth component (build number) that is not part of semver itself.

## [Unreleased]

## [1.1.0.0] - 2026-06-14

### Added

- Search now also indexes enums and complex types, shown as separate "Enums" and "Types" sections alongside service groups and operations; clicking a result opens that type's page directly. Types shared across many service groups are collapsed to a single result labelled with how many groups declare it, and generated array-wrapper types are omitted.
- Enum and complex-type references in operation and type schemas are now clickable, navigating to the referenced type's page (enums included, array-of-enum fields too).

### Changed

- A type's "Used by" list is now labelled with the service group it was opened from, since usages are scoped to that group's WSDL.
- The search result summary is ordered groups · operations · types to match the result sections.

## [1.0.1.0] - 2026-05-13

### Added

- Support for Cloud Hosted Environments (`*.axcloud.dynamics.com`) — Tier-2+ developer and sandbox boxes provisioned through Lifecycle Services.

### Changed

- The `env` identifier is now the full hostname rather than the subdomain prefix, so URL builders (`servicesUrl`, `wsdlUrl`, `operationUrl`, OpenAPI `servers[].url`) work uniformly across both D365 F&O host patterns.

## [1.0.0.0] - 2026-05-10

### Added

- Initial release.
- Side-panel UI for browsing Dynamics 365 Finance & Operations service groups, services, operations, and types.
- Auto-detection of the current D365 environment from the active tab URL.
- Search across service groups and operations.
- Auto-generated example request bodies and `curl` / `fetch` snippets per operation.
- OpenAPI 3.0 export for an entire service group.
