import * as core from '@actions/core'
import * as io from '@actions/io'
import * as cache from '@actions/cache'
import path from 'node:path'
import { Chalk } from 'chalk'

import { type ResolvedVersion, getInstallSettings, runCargoInstall } from './install'
import { parseInput } from './parse'
import { resolveRegistryVersion } from './resolve/registry'
import { resolveGitRev } from './resolve/git'

const chalk = new Chalk({ level: 3 })

async function run (): Promise<void> {
  const input = parseInput()

  // Resolve crate version and try to restore from cache
  core.startGroup(chalk.bold(`Installing ${input.crate}...`))
  const version: ResolvedVersion = input.source.type === 'registry'
    ? await resolveRegistryVersion(input.crate, input.source.version)
    : await resolveGitRev(input.source)

  const install = getInstallSettings(input, version)
  core.info('Installation settings:')
  if ('version' in version) {
    core.info(`   version: ${version.version}`)
  } else {
    core.info(`   repository: ${version.repository}`)
    core.info(`   rev: ${version.rev}`)
  }
  core.info(`   path: ${install.path}`)
  core.info(`   key: ${install.cacheKey}`)

  await io.mkdirP(install.path)
  const restored = await cache.restoreCache([install.path], install.cacheKey)
  core.endGroup()

  // Check if the crate has been restored from cache
  let cacheHit = false
  if (restored !== undefined) {
    core.info(`Restored ${input.crate} from cache.`)
    cacheHit = true
  } else {
    // Install the crate if it wasn't restored from cache
    core.startGroup(`No cached version found, installing ${input.crate} using cargo...`)
    await runCargoInstall(input, version, install)

    try {
      await cache.saveCache([install.path], install.cacheKey)
    } catch (e) {
      core.warning((e as any).message)
    }

    core.endGroup()
  }

  // Add the crate's binary directory to PATH
  core.addPath(path.join(install.path, 'bin'))
  core.info(`Added ${install.path}/bin to PATH.`)

  if ('version' in version) {
    core.info(chalk.green(`Installed ${input.crate} ${version.version}.`))
  } else {
    core.info(chalk.green(`Installed ${input.crate} from ${version.repository} at ${version.rev.slice(0, 7)}.`))
  }

  core.setOutput('version', version)
  core.setOutput('cache-hit', cacheHit)
}

run()
  .catch((error) => {
    core.setFailed(error.message)
    core.info(error.stack)
  })
