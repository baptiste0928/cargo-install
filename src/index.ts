import * as core from "@actions/core"
import * as cache from "@actions/cache"
import * as io from "@actions/io"

import { getCacheKey, getHomePath, parseInput, runCargoInstall } from "./common";
import { fetchCrate, resolveCrateVersion } from "./cratesIo";

async function run(): Promise<void> {
  const input = parseInput()

  core.startGroup(`Installing ${input.crate} ...`)

  core.info("Fetching crate information on crates.io ...")
  const crateInfo = await fetchCrate(input.crate)
  const resolvedVersion = resolveCrateVersion(crateInfo, input.version)

  const installPath = `${getHomePath()}/.cargo-install/${input.crate}`
  const cacheKey = getCacheKey(input, resolvedVersion)

  core.info("Installation settings:")
  core.info(`   version: ${resolvedVersion}`)
  core.info(`   path: ${installPath}`)
  core.info(`   key: ${cacheKey}`)
  core.endGroup()

  const restored = await core.group("Attempt to load from cache ...", async () => {
    await io.mkdirP(installPath)
    return await cache.restoreCache([installPath], cacheKey)
  })
  let cacheHit = false

  if (restored !== undefined) {
    cacheHit = true
    core.info("Restored crate from cache.")
  }
  else {
    await core.group("No cached version found, installing crate ...", async () => {
      await runCargoInstall(input.crate, resolvedVersion, input.features, input.locked, installPath)

      try {
        await cache.saveCache([installPath], cacheKey)
      } catch (e) {
        core.warning((e as any).message)
      }
    })
  }

  core.addPath(`${installPath}/bin`)
  core.info(`Added ${installPath}/bin to PATH.`)
  core.info(`Installed ${input.crate} ${resolvedVersion}.`)

  core.setOutput("version", resolvedVersion)
  core.setOutput("cache-hit", cacheHit)
}

run()
  .then(() => {})
  .catch((error) => {
    core.setFailed(error.message);
    core.info(error.stack);
  })
