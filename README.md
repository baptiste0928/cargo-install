# Cargo install action

![GitHub release (latest by date)](https://img.shields.io/github/v/release/baptiste0928/cargo-install)
[![CI](https://github.com/baptiste0928/cargo-install/actions/workflows/ci.yml/badge.svg)](https://github.com/baptiste0928/cargo-install/actions/workflows/ci.yml)

This action enables you to run `cargo install` in your GitHub workflows, and
automatically caches the resulting binaries to speed up subsequent builds.

| ✨ Recent updates:                                                                                  |
| :-------------------------------------------------------------------------------------------------- |
| **v3.0:** Run on Node 20 instead of Node 16.                                                        |
| **v2.2:** Added support for alternate registries and sparse indexes.                                |
| **v2.1:** Installing crates from git is now supported.                                              |
| **v2.0:** This major update introduces some breaking changes. Read the [changelog] before updating. |

## Features

- Install any Rust binary crate from [crates.io], a git repository or an
  alternate registry.
- Automatically cache installed binaries to avoid compiling them each run.
- Keep crates updated, with an optional version range to avoid breakages.
- Works on Linux, Windows and MacOS runners.

## Usage

The following example steps install the [`cargo-hack`] and [`cargo-sort`]
crates. Read [Quickstart for GitHub Actions] to learn more about Actions usage.

```yaml
- name: Install cargo-hack from crates.io
  uses: baptiste0928/cargo-install@v3
  with:
    crate: cargo-hack
    version: '^0.5' # You can specify any semver range

- name: Install cargo-sort from git
  uses: baptiste0928/cargo-install@v3
  with:
    crate: cargo-sort
    git: https://github.com/devinr528/cargo-sort
    tag: v1.0.9 # `branch` and `commit` are also supported

- name: Run cargo hack
  run: cargo hack --version
```

If no version or branch/tag/commit is specified, the latest version will be
installed. The `--locked` flag is added by default to avoid breakages due to
unexpected dependencies updates.

### Input parameters

- `crate` _(required)_: Name of the crate to install.
- `version`: Version to install (defaults to the latest version). Supports any
  semver range. Only used when installing from crates.io, see below for git
  installation.
- `features`: Space or comma-separated list of crate features to enable.
- `locked`: Use the crate `Cargo.lock` if available (enabled by default). This
  adds `--locked` to the install command arguments.
- `args`: Additional arguments to pass to `cargo install`.
- `cache-key`: Additional string added to the cache key used to manually
  invalidate the cache.

#### Git parameters

- `git`: URL of the git repository to install from.
- `branch`: Branch to install from.
- `tag`: Tag to install from.
- `commit`/`rev`: Commit hash to install from.

`branch`, `tag` and `commit`/`rev` are mutually exclusive. If none of them are
specified, the latest commit of the default branch will be used.

#### Alternate registry parameters

- `registry`: Registry name from the Cargo configuration. See
  [Using an alternate registry](https://doc.rust-lang.org/nightly/cargo/reference/registries.html#using-an-alternate-registry)
  on the Cargo Book.
- `index`: URL of the registry index.

`registry` and `index` are mutually exclusive. Only sparse `index` support
version range resolution, you'll need to specify an exact version when using
`registry` or a non-sparse `index`.

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

The `~/.cargo-install/<crate-name>` folder is cached with a cache key that
follows the following pattern:

```
cargo-install-<crate>-<version or commit>-<hash>
```

The hash is derived from the action job and runner os name, os version and the
installation arguments. The `cache-key` value is added to the hashed string
if provided.

</details>

## Security

Crates are installed using `cargo install` and the latest version is retrieved
from the [crates.io] sparse index. You can ask to install a specific version by
not using any semver range operator.

If using a git repository, the action will use [`git ls-remote`] to retrieve
the commit hash. The repository is cloned by `cargo install`.

## Contributing

There is no particular contribution guidelines, feel free to open a new PR to
improve the code. If you want to introduce a new feature, please create an
issue before.

[changelog]: https://github.com/baptiste0928/cargo-install/releases/tag/v2.0.0
[crates.io]: https://crates.io
[`cargo-hack`]: https://crates.io/crates/cargo-hack
[`cargo-sort`]: https://crates.io/crates/cargo-sort
[`git ls-remote`]: https://git-scm.com/docs/git-ls-remote
[Quickstart for GitHub Actions]: https://docs.github.com/en/actions/quickstart
[Caching dependencies to speed up workflows]: https://docs.github.com/en/actions/advanced-guides/caching-dependencies-to-speed-up-workflows
