import * as http from '@actions/http-client'
import * as core from '@actions/core'
import { scope } from 'arktype'
import semver from 'semver'

import { ActionInput } from './parse'

// Partial response model from crates.io API
type CrateResponse = typeof types.response.infer

const types = scope({
  response: {
    crate: {
      max_stable_version: 'semver'
    },
    versions: 'version[]'
  },
  version: {
    num: 'semver',
    yanked: 'boolean'
  }
}).compile()

// Resolve latest compatible crate version
export async function resolveVersion (input: ActionInput): Promise<string> {
  const res = await fetchCrate(input.crate)

  const latest = res.crate.max_stable_version
  if (input.version === 'latest') {
    return latest
  }

  const resolved = res.versions
    .filter(ver => semver.satisfies(ver.num, input.version))
    .sort((a, b) => semver.compare(a.num, b.num))
    .reverse()
  if (resolved.length === 0) {
    core.setFailed(`No version found for ${input.crate} that satisfies ${input.version}`)
    process.exit(1)
  }

  const version = resolved.find(ver => !ver.yanked) ?? resolved[0]
  if (version.yanked) {
    core.warning(`Using yanked version ${version.num} for ${input.crate}`)
  } else if (version.num !== latest) {
    core.warning(`New version for ${input.crate} available: ${latest}`)
  }

  return version.num
}

async function fetchCrate (name: string): Promise<CrateResponse> {
  const client = new http.HttpClient('cargo-install-action')
  const response = await client.getJson(`https://crates.io/api/v1/crates/${name}`)

  if (response.statusCode === 404 || response.result === null) {
    core.setFailed(`Crate ${name} not found on crates.io`)
    process.exit(1)
  } else if (response.statusCode !== 200) {
    core.setFailed(`Failed to fetch crate ${name} on crates.io`)
    core.info(`Error code: ${response.statusCode}`)
    process.exit(1)
  }

  const { data, problems } = types.response(response.result)

  if (data === undefined) {
    core.setFailed(`Failed to parse crates.io API response for ${name}`)
    core.info(`Errors: ${problems}`) // eslint-disable-line @typescript-eslint/restrict-template-expressions
    process.exit(1)
  }

  return data
}
