import * as core from "@actions/core"
import * as exec from "@actions/exec"
import crypto from "crypto"
import { validate } from "compare-versions"

export interface ActionInput {
  crate: string,
  version: string,
  features: string[],
}

/** Parse action input */
export function parseInput(): ActionInput {
  const crate = core.getInput("crate", { required: true })
  const version = core.getInput("version", { required: true })
  const features = core.getInput("features", { required: false })

  if (version !== "latest" && validate(version) === false) {
    core.setFailed("Invalid version format")
    process.exit(1)
  }

  return {
    crate: crate,
    version: version,
    // Split on comma or space and remove empty results
    features: features.split(/[ ,]+/).filter(Boolean),
  }
}

/** Get path to home directory */
export function getHomePath(): string  {
  return process.env.HOME || process.env.USERPROFILE as string
}

/** Get cache key */
export function getCacheKey(name: string, version: string, features: string[]): string {
  const runnerOs = process.env.RUNNER_OS;
  const jobId = process.env.GITHUB_JOB;
  let key = `${name}-${version}--${jobId}-${runnerOs}`

  if (features.length > 0) {
    key += `-${features.join("-")}`
  }

  const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 20)
  return `cargo-install-${hash}`
}

/** Run cargo install */
export async function runCargoInstall(name: string, version: string, features: string[], installPath: string): Promise<void> {
  const args = ["install", name, "--force", "--root", installPath, "--version", version]
  if (features.length > 0) {
    args.push("--features", features.join(","))
  }
  await exec.exec("cargo", args)
}
