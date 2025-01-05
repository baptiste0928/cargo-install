# Cargo install action

![GitHub release (latest by date)](https://img.shields.io/github/v/release/baptiste0928/cargo-install)
[![CI](https://github.com/baptiste0928/cargo-install/actions/workflows/ci.yml/badge.svg)](https://github.com/baptiste0928/cargo-install/actions/workflows/ci.yml)

> [!IMPORTANT]
>
> **Versions prior to v3.2 will stop working on February 1st, 2025**, due to
> GitHub changing their cache service APIs. See the [`@actions/cache`
> package deprecation notice](https://github.com/actions/toolkit/discussions/1890).

A GitHub Action that runs `cargo install` and automatically caches the resulting binaries to speed up subsequent builds.

## Features

- Install any Rust binary crate from [crates.io], git repositories or custom
  registries
- Automatically cache binaries to avoid repeated compilations
- Version range support to keep crates updated
- Works on Linux, Windows and MacOS runners

## Usage

The following example steps install the [`cargo-hack`] and [`cargo-sort`]
crates. Read [Quickstart for GitHub Actions] to learn more about Actions usage.

```yaml
- name: Install cargo-hack from crates.io
  uses: baptiste0928/cargo-install@v3
  with:
    crate: cargo-hack
    version: '^0.5' # optional semver range (defaults to latest)

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

- `crate` _(required)_: Name of the crate to install
- `version`: Version to install, supports semver range (default: latest)
- `features`: Space or comma-separated list of crate features to enable
- `locked`: Adds `--locked` flag to (default: true)
- `args`: Extra arguments for `cargo install`
- `cache-key`: Custom string added to the cache key to force-invalidate the
  cache

#### Git parameters

When installing from a git repository, the `version` parameter is ignored.

- `git`: URL of the git repository
- `branch`: git branch to install from
- `tag`: git tag to install from
- `commit`/`rev`: commit hash to install from

`branch`, `tag` and `commit`/`rev` are mutually exclusive. If none of them are
specified, the latest commit of the default branch will be used.

#### Custom registry parameters

Version range resolution is only supported when using a sparse registry index with the `index` parameter. Otherwise, only exact versions can be used.

- `index`: Registry index URL
- `registry`: Registry name from the Cargo configuration (see
  [Using an alternate registry](https://doc.rust-lang.org/nightly/cargo/reference/registries.html#using-an-alternate-registry) on the Cargo Book)

`registry` and `index` are mutually exclusive.

### Outputs

- `version`: Installed crate version (or commit hash for git installations)
- `cache-hit`: Boolean indicating whether the crate was restored from cache

## Caching

Compiled binaries are cached in `~/.cargo-install/<crate-name>`. The cache key contains a hash derived from the installation context (command arguments and os version).

Cache entries expire after 7 days of inactivity. For more details, see [GitHub's caching documentation](https://docs.github.com/en/actions/advanced-guides/caching-dependencies-to-speed-up-workflows).

## Security

Installation is done using the `cargo` binary installed in the runner.

When installing from [crates.io] or a custom sparse registry, the action
resolves the latest version prior to installation. It is recommended to pin
exact versions for sensitive workflows.

If using a git repository, the action uses [`git ls-remote`] to resolve the
commit hash. The repository is cloned by `cargo install`.

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
