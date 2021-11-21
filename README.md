# Cargo install action

![GitHub release (latest by date)](https://img.shields.io/github/v/release/baptiste0928/cargo-install)
[![CI](https://github.com/baptiste0928/cargo-install/actions/workflows/ci.yml/badge.svg)](https://github.com/baptiste0928/cargo-install/actions/workflows/ci.yml)

GitHub action for cache-efficient Rust crates installation.

## Features
- Install any crate published on [crates.io](https://crates.io).
- Crates are compiled only if no previous cached version is found.
- Always update to the latest version, respecting the provided version range.
- Tested and working on Linux, Windows and MacOS runners.

## Usage
The following example workflow install the [`cargo-hakari`](https://crates.io/crates/cargo-hakari) crate.
Read [Quickstart for GitHub Actions](https://docs.github.com/en/actions/quickstart) to learn more about Actions usage.

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
- `version`: Compatible version ranges (defaults to latest version). If no operator is provided, it is interpreted like a caret (`^`) operator. The latest compatible version will be installed.
- `features`: Space or comma-separated list of crate features to enable.

### Outputs
- `version`: The version of the crate that has been installed.
- `cache-hit`: A boolean indicating whether the crate was restored from cache.

## Contributing
There is no particular contribution guidelines, feel free to open a new PR to improve the code. If you want to introduce a new feature, please create an issue before.
