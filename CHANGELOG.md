# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Use Node.js 16
- Name and version are no longer hashed in the cache key. This allow to identify
  cache entries in the cache management UI more easily.
- Code has been refactored to make it easier to maintain.

## [1.3.1] - 2023-02-15
### Fixed
- Use `semver` instead of `compare-versions` to fix version resolution issues.
- Dependencies have been updated. This removes the warning about `set-output` being deprecated.

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

[Unreleased]: https://github.com/baptiste0928/cargo-install/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/baptiste0928/cargo-install/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/baptiste0928/cargo-install/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/baptiste0928/cargo-install/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/baptiste0928/cargo-install/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/baptiste0928/cargo-install/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/baptiste0928/cargo-install/releases/tag/v1.0.0
