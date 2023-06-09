import * as core from '@actions/core'
import * as exec from '@actions/exec'
import path from 'node:path'
import crypto from 'node:crypto'

import type { ActionInput } from './parse'

// Resolved version information for the crate
export type ResolvedVersion =
  | { version: string }
  | { repository: string, commit: string }

// Installation settings for the crate (path and cache key)
export interface InstallSettings {
  path: string
  cacheKey: string
}

// Get the installation settings for the crate (path and cache key)
export function getInstallSettings (input: ActionInput, version: ResolvedVersion): InstallSettings {
  const homePath = process.env.HOME ?? process.env.USERPROFILE
  if (homePath === undefined || homePath === '') {
    core.setFailed('Could not determine home directory (missing HOME and USERPROFILE environement variables)')
    process.exit(1)
  }

  const installPath = path.join(homePath, '.cargo-install', input.crate)
  const cacheKey = getCacheKey(input, version)

  return {
    path: installPath,
    cacheKey
  }
}

function getCacheKey (input: ActionInput, version: ResolvedVersion): string {
  const runnerOs = process.env.RUNNER_OS
  const jobId = process.env.GITHUB_JOB

  if (runnerOs === undefined || jobId === undefined) {
    core.setFailed('Could not determine runner OS or job ID')
    process.exit(1)
  }

  let hashKey = jobId + runnerOs
  for (const feature of input.features) {
    hashKey += feature
  }
  for (const arg of input.args) {
    hashKey += arg
  }
  if (input.cacheKey?.length > 0) {
    hashKey += input.cacheKey
  }

  const hash = crypto.createHash('sha256').update(hashKey).digest('hex').slice(0, 20)
  const versionKey = 'version' in version ? version.version : version.commit.slice(0, 7)

  return `cargo-install-${input.crate}-${versionKey}-${hash}`
}

export async function runCargoInstall (input: ActionInput, version: ResolvedVersion, install: InstallSettings): Promise<void> {
  let commandArgs = ['install', input.crate, '--force', '--root', install.path]

  if ('version' in version) {
    commandArgs.push('--version', version.version)
  } else {
    commandArgs.push('--git', version.repository, '--rev', version.commit)
  }

  if (input.features.length > 0) {
    commandArgs.push('--features', input.features.join(','))
  }

  if (input.args.length > 0) {
    commandArgs = commandArgs.concat(input.args)
  }

  await exec.exec('cargo', commandArgs)
}
