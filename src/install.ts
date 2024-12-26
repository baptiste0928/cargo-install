import * as core from '@actions/core';
import * as exec from '@actions/exec';
import path from 'node:path';
import crypto from 'node:crypto';

import type { ActionInput } from './parse';

// Resolved version information for the crate
export type ResolvedVersion =
  | { version: string }
  | { repository: string; commit: string };

// Installation settings for the crate (path and cache key)
export interface InstallSettings {
  path: string;
  cacheKey: string;
}

// Get the installation settings for the crate (path and cache key)
export async function getInstallSettings(
  input: ActionInput,
  version: ResolvedVersion,
): Promise<InstallSettings> {
  const homePath = process.env.HOME ?? process.env.USERPROFILE;
  if (homePath === undefined || homePath === '') {
    core.setFailed(
      'Could not determine home directory (missing HOME and USERPROFILE environement variables)',
    );
    process.exit(1);
  }

  const installPath = path.join(homePath, '.cargo-install', input.crate);
  const cacheKey = await getCacheKey(input, version);

  return {
    path: installPath,
    cacheKey,
  };
}

// Get the os version of the runner, used for the cache key
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

async function getCacheKey(
  input: ActionInput,
  version: ResolvedVersion,
): Promise<string> {
  const runnerOs = process.env.RUNNER_OS;
  const runnerArch = process.env.RUNNER_ARCH;
  const jobId = process.env.GITHUB_JOB;
  const osVersion = await getOsVersion();

  if (
    runnerOs === undefined ||
    runnerArch === undefined ||
    jobId === undefined
  ) {
    core.setFailed('Could not determine runner OS, runner arch or job ID');
    process.exit(1);
  }

  let hashKey =
    (input.sharedKey || jobId) + runnerOs + runnerArch + (osVersion ?? '');

  hashKey += input.source.type;
  if (input.source.type === 'registry') {
    hashKey += input.source.registry ?? '';
    hashKey += input.source.index ?? '';
  } else {
    hashKey += input.source.repository;
    hashKey += input.source.branch ?? '';
    hashKey += input.source.tag ?? '';
    hashKey += input.source.commit ?? '';
  }

  for (const feature of input.features) {
    hashKey += feature;
  }
  for (const arg of input.args) {
    hashKey += arg;
  }
  if (input.cacheKey?.length > 0) {
    hashKey += input.cacheKey;
  }

  const hash = crypto
    .createHash('sha256')
    .update(hashKey)
    .digest('hex')
    .slice(0, 20);
  const versionKey =
    'version' in version ? version.version : version.commit.slice(0, 7);

  return `cargo-install-${input.crate}-${versionKey}-${hash}`;
}

export async function runCargoInstall(
  input: ActionInput,
  version: ResolvedVersion,
  install: InstallSettings,
): Promise<void> {
  let commandArgs = ['install', input.crate, '--force', '--root', install.path];

  if ('version' in version) {
    commandArgs.push('--version', version.version);
  } else {
    commandArgs.push('--git', version.repository, '--rev', version.commit);
  }

  if (input.source.type === 'registry' && input.source.registry !== undefined) {
    commandArgs.push('--registry', input.source.registry);
  }
  if (input.source.type === 'registry' && input.source.index !== undefined) {
    commandArgs.push('--index', input.source.index);
  }

  if (input.features.length > 0) {
    commandArgs.push('--features', input.features.join(','));
  }

  if (input.args.length > 0) {
    commandArgs = commandArgs.concat(input.args);
  }

  await exec.exec('cargo', commandArgs);
}
