import * as core from "@actions/core"
import * as exec from "@actions/exec"
import crypto from "crypto"
import { validate } from "compare-versions"

export interface ActionInput {
  crate: string,
  version: string,
  features: string[],
  locked: boolean,
  cacheKey: string,
}

/** Parse action input */
export function parseInput(): ActionInput {
  const crate = core.getInput("crate", { required: true })
  const version = core.getInput("version", { required: true })
  const features = core.getInput("features", { required: false })
  const locked = core.getBooleanInput("locked", { required: false })
  const cacheKey = core.getInput("cache-key", { required: false })

  if (version !== "latest" && validate(version) === false) {
    core.setFailed("Invalid version format")
    process.exit(1)
  }

  return {
    crate: crate,
    version: version,
    // Split on comma or space and remove empty results
    features: features.split(/[ ,]+/).filter(Boolean),
    locked: locked,
    cacheKey: cacheKey,
  }
}

/** Get path to home directory */
export function getHomePath(): string  {
  return process.env.HOME || process.env.USERPROFILE as string
}

/** Get cache key */
export function getCacheKey(input: ActionInput, version: string): string {
  const runnerOs = process.env.RUNNER_OS
  const jobId = process.env.GITHUB_JOB
  let key = `${input.crate}-${version}--${jobId}-${runnerOs}`

  if (input.features.length > 0) {
    key += `-${input.features.join("-")}`
  }

  if (input.locked) {
    key += "-locked"
  }

  if (input.cacheKey) {
    key += `-${input.cacheKey}`
  }

  const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 20)
  return `cargo-install-${hash}`
}

/** Run cargo install */
export async function runCargoInstall(name: string, version: string, features: string[], locked: boolean, installPath: string): Promise<void> {
  const args = ["install", name, "--force", "--root", installPath, "--version", version]

  if (locked) {
    args.push("--locked")
  }

  if (features.length > 0) {
    args.push("--features", features.join(","))
  }

  await exec.exec("cargo", args)
}
