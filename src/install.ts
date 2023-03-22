import * as core from '@actions/core'
import path from 'node:path'
import crypto from 'node:crypto'
import * as exec from '@actions/exec'

import { ActionInput } from './parse'

export interface InstallSettings {
  path: string
  cacheKey: string
}

export function getInstallSettings (input: ActionInput, version: string): InstallSettings {
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

function getCacheKey (input: ActionInput, version: string): string {
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
  return `cargo-install-${input.crate}-${version}-${hash}`
}

export async function runCargoInstall (input: ActionInput, version: string, install: InstallSettings): Promise<void> {
  let commandArgs = ['install', input.crate, '--force', '--root', install.path, '--version', version]

  if (input.features.length > 0) {
    commandArgs.push('--features', input.features.join(','))
  }

  if (input.args.length > 0) {
    commandArgs = commandArgs.concat(input.args)
  }

  await exec.exec('cargo', commandArgs)
}
