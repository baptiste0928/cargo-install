# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.1] - 2024-06-24

### Fixed

- Pre-release versions are ignored when resolving the latest version.

## [3.1.0] - 2024-04-10

### Changed

- Runner arch is included in the cache key.

### Fixed

- Fix runner os version resolution on macOS runners. (issue #24)

## [3.0.1] - 2024-03-08

### Fixed

- Improve git tag/branch resolution. (issue #22)

## [3.0.0] - 2024-02-01

### Added

- Runner os version is included in the cache key. (issue #21)

### Changed

- **Breaking:** The action now runs on Node.js 20.
- Dependencies have been updated.

## [2.2.0] - 2023-09-07

### Added

- Support alternative registries with the `registry` and `index` input
  parameters.

### Changed

- Crate versions are fetched from the sparse index instead of the crates.io
  API.

## [2.1.0] - 2023-06-09

### Added

- Git installation is now supported with the `git` input parameter. You can
  specify a branch, tag or commit hash.

## [2.0.0] - 2023-03-23

### Added

- Name and version are shown in the cache key. This allow to identify cache
  entries in the cache management UI more easily.

### Changed

- **Breaking:** The action now runs on Node.js 16.
- **Breaking:** Versions without semver range (e.g. `1.2.3`) are now considered
  as exact versions.
- **Breaking:** Set `--locked` by default. `locked` input is no longer
  deprecated.
- Various code improvements and refactoring.

## [1.3.1] - 2023-02-15

### Fixed

- Use `semver` instead of `compare-versions` to fix version resolution issues.
- Dependencies have been updated. This removes the warning about `set-output`
  being deprecated.

## [1.3.0] - 2022-06-14

### Added

- Add `args` input to add additional arguments to the `cargo install` command.

### Deprecated

- `locked` input is deprecated, use the `args` input with `--locked` instead.

## [1.2.0] - 2022-03-16

### Added

- Add `locked` input to add `--locked` argument to `cargo install` command.

### Changed

- Dependencies have been updated.

## [1.1.0] - 2022-01-14

### Added

- Add `cache-key` input to add a custom key to the automatic cache key.

## [1.0.1] - 2022-01-07

### Fixed

- Errors when saving cache no longer cause the workflow to fail.

## [1.0.0] - 2021-11-21

### Added

- Initial release of `cargo-install` action.

[Unreleased]: https://github.com/baptiste0928/cargo-install/compare/v3.1.1...HEAD
[3.1.1]: https://github.com/baptiste0928/cargo-install/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/baptiste0928/cargo-install/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/baptiste0928/cargo-install/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/baptiste0928/cargo-install/compare/v2.2.0...v3.0.0
[2.2.0]: https://github.com/baptiste0928/cargo-install/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/baptiste0928/cargo-install/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/baptiste0928/cargo-install/compare/v1.3.1...v2.0.0
[1.3.1]: https://github.com/baptiste0928/cargo-install/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/baptiste0928/cargo-install/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/baptiste0928/cargo-install/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/baptiste0928/cargo-install/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/baptiste0928/cargo-install/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/baptiste0928/cargo-install/releases/tag/v1.0.0
