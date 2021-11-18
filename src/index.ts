import * as core from "@actions/core"
import * as cache from "@actions/cache"
import * as io from "@actions/io"

import { getCacheKey, getHomePath, installCargoSearch2, parseInput, queryCargoSearch2, runCargoInstall } from "./common";

async function run(): Promise<void> {
  const input = parseInput()

  await core.group("Downloading cargo-search2 ...", async () => {
    await installCargoSearch2()
  })

  core.startGroup(`Installing ${input.crate} ...`)

  core.info("Getting crate information with cargo-search2 ...")
  const output = await queryCargoSearch2(input.crate, input.version)

  const installPath = `${getHomePath()}/.cargo-install/${input.crate}`
  const cacheKey = getCacheKey(input.crate, output.version, input.features)

  core.info("Installation settings:")
  core.info(`   version: ${output.version}`)
  core.info(`   path: ${installPath}`)
  core.info(`   key: ${cacheKey}`)
  core.endGroup()

  core.info("Attempt to load from cache ...")
  await io.mkdirP(installPath)
  const restored = await cache.restoreCache([installPath], cacheKey)
  let cacheHit = false

  if (restored !== undefined) {
    cacheHit = true
    core.info("Restored crate from cache.")
  }
  else {
    await core.group("No cached version found, installing crate ...", async () => {
      await runCargoInstall(input.crate, output.version, input.features, installPath)
      await cache.saveCache([installPath], cacheKey)
    })
  }

  core.addPath(`${installPath}/bin`)
  core.info(`Added ${installPath}/bin to PATH.`)
  core.info(`Installed ${input.crate} ${output.version}!`)

  core.setOutput("version", output.version)
  core.setOutput("cache-hit", cacheHit)
}

run()
  .then(() => {})
  .catch((error) => {
    core.setFailed(error.message);
    core.info(error.stack);
  })
