import core from '@actions/core'
import semver from 'semver'
import stringArgv from 'string-argv'

export interface ActionInput {
  crate: string
  version: string
  features: string[]
  args: string[]
  cacheKey: string
}

// Parse and validate action input
export function parseInput (): ActionInput {
  const crate = core.getInput('crate', { required: true })
  const version = core.getInput('version', { required: true })
  const features = core.getInput('features', { required: false })
  const locked = core.getBooleanInput('locked', { required: false })
  const args = core.getInput('args', { required: false })
  const cacheKey = core.getInput('cache-key', { required: false })

  if (version !== 'latest' && semver.validRange(version) === null) {
    core.setFailed('Invalid version provided. Must be a valid semver range or "latest".')
    process.exit(1)
  }

  const parsedArgs = stringArgv(args)
  const parsedFeatures = features.split(/[ ,]+/).filter(Boolean)

  if (locked) {
    parsedArgs.push('--locked')
  }

  return {
    crate,
    version,
    features: parsedFeatures,
    args: parsedArgs,
    cacheKey
  }
}
