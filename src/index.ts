import * as core from '@actions/core'
import * as io from '@actions/io'
import * as cache from '@actions/cache'
import { getInstallSettings, runCargoInstall } from './install'

import { parseInput } from './parse'
import { resolveVersion } from './resolve'

async function run (): Promise<void> {
  const input = parseInput()

  core.startGroup(`Installing ${input.crate} ...`)
  core.info('Fetching crate information on crates.io ...')
  const version = await resolveVersion(input)
  const install = getInstallSettings(input, version)

  core.info('Installation settings:')
  core.info(`   version: ${version}`)
  core.info(`   path: ${install.path}`)
  core.info(`   key: ${install.cacheKey}`)

  await io.mkdirP(install.path)
  const restored = await cache.restoreCache([install.path], install.cacheKey)

  core.endGroup()

  let cacheHit = false
  if (restored !== undefined) {
    core.info(`Restored ${input.crate} from cache.`)
    cacheHit = true
  } else {
    core.startGroup(`No cached version found, installing ${input.crate} using cargo ...`)
    await runCargoInstall(input, version, install)

    try {
      await cache.saveCache([install.path], install.cacheKey)
    } catch (e) {
      core.warning((e as any).message)
    }

    core.endGroup()
  }

  core.addPath(install.path)
  core.info(`Added ${install.path} to PATH.`)
  core.info(`Installed ${input.crate} ${version}.`)

  core.setOutput('version', version)
  core.setOutput('cache-hit', cacheHit)
}

run()
  .catch((error) => {
    core.setFailed(error.message)
    core.info(error.stack)
  })
