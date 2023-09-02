import * as http from '@actions/http-client'
import * as core from '@actions/core'
import semver from 'semver'

import type { ResolvedVersion } from '../install'
import { Output, boolean, custom, object, parse, string } from 'valibot'

const CrateVersionSchema = object({
  vers: string([
    custom(input => semver.valid(input) !== null, 'Invalid semver version')
  ]),
  yanked: boolean()
})

type CrateVersion = Output<typeof CrateVersionSchema>

// Resolve latest compatible crate version
export async function resolveRegistryVersion (crate: string, version: string): Promise<ResolvedVersion> {
  core.info(`Fetching information for ${crate} from crates.io index ...`)
  const versions = await fetchIndex(crate)

  const sortedVersions = versions
    .sort((a, b) => semver.compare(a.vers, b.vers))
    .reverse()
  const latest = sortedVersions.find(ver => !ver.yanked) ?? sortedVersions[0]

  if (version === 'latest') {
    return { version: latest.vers }
  }

  const resolved = sortedVersions.filter(ver => semver.satisfies(ver.vers, version))
  if (resolved.length === 0) {
    core.setFailed(`No version found for ${crate} that satisfies ${version}`)
    core.info(`Available versions: ${versions.map(ver => ver.vers).join(', ')}`)
    process.exit(1)
  }

  const resolvedVersion = resolved.find(ver => !ver.yanked) ?? resolved[0]
  if (resolvedVersion.yanked) {
    core.warning(`Using yanked version ${resolvedVersion.vers} for ${crate}`)
  } else if (resolvedVersion.vers !== latest.vers) {
    core.warning(`New version for ${crate} available: ${sortedVersions[0].vers}`)
  }

  return { version: resolvedVersion.vers }
}

async function fetchIndex (crate: string): Promise<CrateVersion[]> {
  const client = new http.HttpClient('cargo-install-action')
  const response = await client.get(`https://index.crates.io/${getIndexPath(crate)}`)

  if (response.message.statusCode === 404) {
    core.setFailed(`Crate ${crate} not found on crates.io index`)
    process.exit(1)
  } else if (response.message.statusCode !== 200) {
    core.setFailed(`Failed to fetch crate ${crate} on crates.io index`)
    core.info(`Error: ${response.message.statusMessage ?? ''} (${response.message.statusCode ?? ''})`)
    process.exit(1)
  }

  const body = await response.readBody()

  return body
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => parse(CrateVersionSchema, line))
}

// Get index path for crate
// https://doc.rust-lang.org/cargo/reference/registry-index.html#index-files
function getIndexPath (crate: string): string {
  const name = crate.toLowerCase()

  if (name.length === 1) {
    return `1/${name}`
  }
  if (name.length === 2) {
    return `2/${name}`
  }
  if (name.length === 3) {
    return `3/${name.slice(0, 1)}/${name}`
  }

  return `${name.slice(0, 2)}/${name.slice(2, 4)}/${name}`
}
