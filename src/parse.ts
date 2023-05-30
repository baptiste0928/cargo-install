import * as core from '@actions/core'
import * as semver from 'semver'
import stringArgv from 'string-argv'

export interface ActionInput {
  crate: string
  source: CratesIoSource | GitSource
  features: string[]
  args: string[]
  cacheKey: string
}

export interface CratesIoSource {
  version: string
}

export interface GitSource {
  repository: string
  branch?: string
  tag?: string
  rev?: string
}

// Parse and validate action input
export function parseInput (): ActionInput {
  // Global parameters
  const crate = core.getInput('crate', { required: true })
  const features = core.getInput('features', { required: false })
  const locked = core.getBooleanInput('locked', { required: false })
  const args = core.getInput('args', { required: false })
  const cacheKey = core.getInput('cache-key', { required: false })

  const parsedArgs = stringArgv(args)
  const parsedFeatures = features.split(/[ ,]+/).filter(Boolean)
  if (locked) {
    parsedArgs.push('--locked')
  }

  // Crates.io version (always provided, defaults to 'latest')
  const version = core.getInput('version', { required: true })
  if (version !== 'latest' && semver.validRange(version) === null) {
    core.setFailed('Invalid version provided. Must be a valid semver range or "latest".')
    process.exit(1)
  }

  // Git source (optional, overrides Crates.io version if provided)
  const repository = core.getInput('git', { required: false })
  const branch = core.getInput('branch', { required: false })
  const tag = core.getInput('tag', { required: false })
  const rev = core.getInput('rev', { required: false })

  let source: CratesIoSource | GitSource = { version }
  if (repository !== '') {
    source = { repository }
    source.branch = branch !== '' ? branch : undefined
    source.tag = tag !== '' ? tag : undefined
    source.rev = rev !== '' ? rev : undefined
  }

  // Warnings if both crates.io and git are provided
  if (repository === '' && (branch !== '' || tag !== '' || rev !== '')) {
    core.warning('Ignoring branch, tag, and rev since git is not provided.')
  }
  if (repository !== '' && version !== 'latest') {
    core.warning('Ignoring version since git is provided.')
  }

  return {
    crate,
    source,
    features: parsedFeatures,
    args: parsedArgs,
    cacheKey
  }
}
