import * as core from '@actions/core'
import * as exec from '@actions/exec'
import crypto from 'crypto'
import * as semver from 'semver'
import stringArgv from 'string-argv'

export interface ActionInput {
  crate: string
  version: string
  features: string[]
  args: string[]
  cacheKey: string
}

/** Parse action input */
export function parseInput (): ActionInput {
  const crate = core.getInput('crate', { required: true })
  const version = core.getInput('version', { required: true })
  const features = core.getInput('features', { required: false })
  const locked = core.getBooleanInput('locked', { required: false })
  const args = stringArgv(core.getInput('args', { required: false }))
  const cacheKey = core.getInput('cache-key', { required: false })

  if (semver.validRange(version) === null && version !== 'latest') {
    core.setFailed('Invalid version format')
    process.exit(1)
  }

  // Note: locked is deprecated and will be removed in the future.
  if (locked) {
    args.push('--locked')
  }

  return {
    crate,
    version,
    // Split on comma or space and remove empty results
    features: features.split(/[ ,]+/).filter(Boolean),
    args,
    cacheKey
  }
}

/** Get path to home directory */
export function getHomePath (): string {
  const homePath = process.env.HOME ?? process.env.USERPROFILE

  if (homePath === undefined || homePath === '') {
    core.setFailed('Could not determine home directory')
    process.exit(1)
  }

  return homePath
}

/** Get cache key */
export function getCacheKey (input: ActionInput, version: string): string {
  const runnerOs = process.env.RUNNER_OS
  const jobId = process.env.GITHUB_JOB

  if (runnerOs === undefined || jobId === undefined) {
    core.setFailed('Could not determine runner OS or job ID')
    process.exit(1)
  }

  let key = `${input.crate}-${version}--${jobId}-${runnerOs}`

  if (input.features.length > 0) {
    key += `-${input.features.join('-')}`
  }

  if (input.args.length > 0) {
    key += `-${input.args.join('-')}`
  }

  if (input.cacheKey?.length > 0) {
    key += `-${input.cacheKey}`
  }

  const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 20)
  return `cargo-install-${hash}`
}

/** Run cargo install */
export async function runCargoInstall (name: string, version: string, features: string[], args: string[], installPath: string): Promise<void> {
  let commandArgs = ['install', name, '--force', '--root', installPath, '--version', version]

  if (features.length > 0) {
    commandArgs.push('--features', features.join(','))
  }

  if (args.length > 0) {
    commandArgs = commandArgs.concat(args)
  }

  await exec.exec('cargo', commandArgs)
}
