# Cargo install action

![GitHub release (latest by date)](https://img.shields.io/github/v/release/baptiste0928/cargo-install)
[![CI](https://github.com/baptiste0928/cargo-install/actions/workflows/ci.yml/badge.svg)](https://github.com/baptiste0928/cargo-install/actions/workflows/ci.yml)

GitHub action for cache-efficient Rust crates installation.

## Features
- Install any crate published on [crates.io].
- Crates are compiled only if no previous cached version is found.
- Always update to the latest version, respecting the provided version range.
- Tested and working on Linux, Windows and MacOS runners.

## Usage
The following example workflow install the [`cargo-hakari`] crate. Read
[Quickstart for GitHub Actions] to learn more about Actions usage.

```yaml
- name: Install cargo-hakari
  uses: baptiste0928/cargo-install@v1
  with:
    crate: cargo-hakari
    version: "0.9"  # Most recent version compatible with 0.9

- name: Run cargo-hakari
  run: cargo hakari generate --diff  # Installed crate has been added to PATH
```

### Inputs
- `crate` *(required)*: Name of the crate to install.
- `version`: Compatible version ranges (defaults to latest version). If no
operator is provided, it is interpreted like a caret (`^`) operator. The latest
semver compatible version will be installed.
- `features`: Space or comma-separated list of crate features to enable.
- `locked`: Use the crate `Cargo.lock` if available. This adds `--locked` to
the install command arguments.
- `cache-key`: Additional key added to the automatic cache key used to manually
invalidate the cache.

### Outputs
- `version`: The version of the crate that has been installed.
- `cache-hit`: A boolean indicating whether the crate was restored from cache.

## Caching
Compiled binaries of installed crates are automatically cached. If a cached
version is present when the action is executed, it will be used. This allows the
installation of the crate to be almost instant in most cases.

Cached binaries will be automatically removed by GitHub if they have not been
accessed in the last 7 days. Read [Caching dependencies to speed up workflows]
to learn more about caching with GitHub Actions.

<details>
  <summary><strong>Cache key details</strong></summary>

  The `~/.cargo-install/<crate-name>` folder is cached with the `cargo-install-<hash>`
  key. The cache key is composed of the following elements:

  - The crate name.
  - The exact installed crate version (not the `version` input).
  - The action `job` and runner os name.
  - List of installed features.
  - If provided, the `cache-key` input value.

  These values are hashed and a 20 characters hex digest is used as the cache key.

</details>

### Custom cache key
If needed, you can specify an additional key that will be added to the automatic
cache key with the `cache-key` input. This can be useful to manually invalidate
the cache.

```yaml
- name: Install cargo-hakari
  uses: baptiste0928/cargo-install@v1
  with:
    crate: cargo-hakari
    cache-key: customKey  # Custom key added to the automatic cache key
```

## Security
Crates are installed using `cargo install` and the latest version is retrieved
with the [crates.io] API. If you want harder security, you can specify a strict
version requirement (e.g. `=0.9.1`) and manually bump the version on crate updates.

## Contributing
There is no particular contribution guidelines, feel free to open a new PR to
improve the code. If you want to introduce a new feature, please create an issue
before.

[crates.io]: https://crates.io
[`cargo-hakari`]: https://crates.io/crates/cargo-hakari
[Quickstart for GitHub Actions]: https://docs.github.com/en/actions/quickstart
[Caching dependencies to speed up workflows]: https://docs.github.com/en/actions/advanced-guides/caching-dependencies-to-speed-up-workflows
