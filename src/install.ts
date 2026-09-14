import * as core from '@actions/core';
import * as exec from '@actions/exec';
import crypto from 'node:crypto';
import path from 'node:path';

import type { ActionInput, Crate } from './parse';

export type ResolvedVersion =
  { version: string } | { repository: string; commit: string };

export interface InstallSettings {
  path: string;
  args: string[];
  env: Record<string, string>;
  cacheKey: string;
}

// Get the installation settings for the crate (path, arguments and cache key)
export async function getInstallSettings(
  crate: Crate,
  input: ActionInput,
  version: ResolvedVersion,
): Promise<InstallSettings> {
  const homePath = process.env.HOME ?? process.env.USERPROFILE;

  if (homePath === undefined || homePath === '') {
    core.setFailed('Could not determine home directory');
    process.exit(1);
  }

  const installPath = path.join(homePath, '.cargo-install', crate.name);
  const args = getInstallArgs(crate, input, version, installPath);
  const env = { CARGO_INSTALL_ROOT: installPath };
  const cacheKey = await getCacheKey(crate, input, version, args);

  return {
    path: installPath,
    args,
    env,
    cacheKey,
  };
}

// Generate the arguments that will be passed to `cargo` to install the crate.
function getInstallArgs(
  crate: Crate,
  input: ActionInput,
  version: ResolvedVersion,
  installPath: string,
): string[] {
  let args = ['install', crate.name, '--force', '--root', installPath];

  if ('version' in version) {
    args.push('--version', version.version);
  } else {
    args.push('--git', version.repository, '--rev', version.commit);
  }

  if (crate.source.type === 'registry' && crate.source.registry) {
    args.push('--registry', crate.source.registry);
  }
  if (crate.source.type === 'registry' && crate.source.index) {
    args.push('--index', crate.source.index);
  }

  if (crate.features.length > 0) {
    args.push('--features', crate.features.join(','));
  }

  if (input.args.length > 0) {
    args = args.concat(input.args);
  }

  return args;
}

async function getCacheKey(
  crate: Crate,
  input: ActionInput,
  version: ResolvedVersion,
  args: string[],
): Promise<string> {
  const runnerOs = process.env.RUNNER_OS;
  const runnerArch = process.env.RUNNER_ARCH;
  const osVersion = await getOsVersion();

  if (runnerOs === undefined || runnerArch === undefined) {
    core.setFailed('Could not determine runner OS or runner arch');
    process.exit(1);
  }

  /**
   * Most of the cache key is a hash of the parameters that may affect the build
   * output. We take only the first 24 characters to improve readability.
   *
   * The key is composed of:
   * - the runner os information (os name, architecture and version)
   * - the arguments passed to cargo install (which contain the exact version
   *   installed, features enabled, ...)
   * - additionally, the cache key provided by the user
   */

  const hashKey =
    runnerOs +
    runnerArch +
    (osVersion ?? '') +
    args.join(' ') +
    (input.cacheKey ?? '');

  const hash = crypto
    .createHash('sha256')
    .update(hashKey)
    .digest('hex')
    .slice(0, 24);

  // We include the installed crate and version in the cache key to make it
  // easier to identify if a manual invalidation is needed.
  const versionKey =
    'version' in version ? version.version : version.commit.slice(0, 7);

  return `cargo-install-${crate.name}-${versionKey}-${hash}`;
}

async function getOsVersion(): Promise<string | undefined> {
  const runnerOs = process.env.RUNNER_OS;

  if (runnerOs === 'Linux') {
    const output = await exec.getExecOutput('cat', ['/etc/os-release'], {
      silent: true,
    });
    const match = output.stdout.match(/VERSION_ID="(.*)"/);
    return match?.[1];
  }

  if (runnerOs === 'macOS') {
    const output = await exec.getExecOutput('sw_vers', ['-productVersion'], {
      silent: true,
    });
    return output.stdout.trim();
  }

  if (runnerOs === 'Windows') {
    const major = await exec.getExecOutput(
      'pwsh',
      ['-Command', '[System.Environment]::OSVersion.Version.Major'],
      { silent: true },
    );
    const minor = await exec.getExecOutput(
      'pwsh',
      ['-Command', '[System.Environment]::OSVersion.Version.Minor'],
      { silent: true },
    );
    return `${major.stdout.trim()}.${minor.stdout.trim()}`;
  }
}
