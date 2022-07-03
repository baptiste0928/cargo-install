import * as core from '@actions/core'
import axios from 'axios'
import compareVersions, { satisfies } from 'compare-versions'

/** Fetch a crate information */
export async function fetchCrate (name: string): Promise<CrateInfo> {
  try {
    const json = await axios.get(`https://crates.io/api/v1/crates/${name}`).then(res => res.data)
    return json as CrateInfo
  } catch (error) {
    core.setFailed(`Failed to fetch crate ${name} on crates.io`)
    core.info(`Error: ${error}`) // eslint-disable-line @typescript-eslint/restrict-template-expressions
    process.exit(1)
  }
}

interface CrateInfo {
  crate: { max_stable_version: string }
  versions: Array<{ num: string, yanked: boolean }>
}

/** Resolve request crate version */
export function resolveCrateVersion (crate: CrateInfo, range: string): string {
  const latestVersion = crate.crate.max_stable_version

  if (range === 'latest') {
    return latestVersion
  } else {
    const normalizedRange = normalizeRange(range)
    const resolvedVersion = crate
      .versions
      .filter(v => !v.yanked)
      .map(v => v.num)
      .filter(v => satisfies(v, normalizedRange))
      .sort(compareVersions)
      .reverse()[0]

    if (resolvedVersion === undefined) {
      core.setFailed(`No version found for ${range}`)
      process.exit(1)
    } else {
      if (resolvedVersion !== latestVersion) {
        core.warning(`Newest stable version available : ${latestVersion}`)
      }

      return resolvedVersion
    }
  }
}

/** Normalize version (if no range, default to ^) */
export function normalizeRange (range: string): string {
  if (range.match(/^[0-9]/) != null) {
    return `^${range}`
  } else {
    return range
  }
}
