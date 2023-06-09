import * as http from '@actions/http-client'
import * as core from '@actions/core'
import { scope } from 'arktype'
import semver from 'semver'

import type { ResolvedVersion } from '../install'

// Partial response from crates.io API
const crateResponseTypes = scope({
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

type CrateResponse = typeof crateResponseTypes.response.infer

// Resolve latest compatible crate version
export async function resolveRegistryVersion (crate: string, version: string): Promise<ResolvedVersion> {
  core.info(`Fetching information for ${crate} on crates.io ...`)
  const res = await fetchCrate(crate)

  const latest = res.crate.max_stable_version
  if (version === 'latest') {
    return { version: latest }
  }

  const resolved = res.versions
    .filter(ver => semver.satisfies(ver.num, version))
    .sort((a, b) => semver.compare(a.num, b.num))
    .reverse()
  if (resolved.length === 0) {
    core.setFailed(`No version found for ${crate} that satisfies ${version}`)
    core.info(`Available versions: ${res.versions.map(ver => ver.num).join(', ')}`)
    process.exit(1)
  }

  const resolvedVersion = resolved.find(ver => !ver.yanked) ?? resolved[0]
  if (resolvedVersion.yanked) {
    core.warning(`Using yanked version ${resolvedVersion.num} for ${crate}`)
  } else if (resolvedVersion.num !== latest) {
    core.warning(`New version for ${crate} available: ${latest}`)
  }

  return { version: resolvedVersion.num }
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

  const { data, problems } = crateResponseTypes.response(response.result)

  if (data === undefined) {
    core.setFailed(`Failed to parse crates.io API response for ${name}`)
    core.info(`Errors: ${problems}`) // eslint-disable-line @typescript-eslint/restrict-template-expressions
    process.exit(1)
  }

  return data
}
