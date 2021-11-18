import * as core from "@actions/core"
import * as exec from "@actions/exec"
import * as tc from "@actions/tool-cache"

export interface ActionInput {
  crate: string,
  version: string,
  features: string[],
}

/** Parse action input */
export function parseInput(): ActionInput {
  return {
    crate: core.getInput("crate", { required: true }),
    version: core.getInput("version", { required: true }),
    // Split on comma or space and remove empty results
    features: core.getInput("features").split(/[ ,]+/).filter(Boolean),
  }
}

/** Get path to home directory */
export function getHomePath(): string  {
  return process.env.HOME || process.env.USERPROFILE as string
}

/** Install cargo-search2 */
export async function installCargoSearch2(): Promise<void> {
  const homePath = getHomePath()

  if (process.platform === "win32") {
    const downloadPath = await tc.downloadTool("https://github.com/sunshowers/cargo-search2/releases/latest/download/cargo-search2-x86_64-pc-windows-msvc.zip")
    await tc.extractZip(downloadPath, `${homePath}/.cargo/bin`)
  } else if (process.platform === "darwin") {
    const downloadPath = await tc.downloadTool("https://github.com/sunshowers/cargo-search2/releases/latest/download/cargo-search2-x86_64-apple-darwin.tar.gz")
    await tc.extractTar(downloadPath, `${homePath}/.cargo/bin`)
  } else {
    const downloadPath = await tc.downloadTool("https://github.com/sunshowers/cargo-search2/releases/latest/download/cargo-search2-x86_64-unknown-linux-gnu.tar.gz")
    await tc.extractTar(downloadPath, `${homePath}/.cargo/bin`)
  }

  core.info(`Installed cargo-search2 in ${homePath}/.cargo/bin`)
}

export interface CargoSearch2Output {
  "crate-name": string,
  version: string,
  hash: string,
}

/** Query cargo-search2 */
export async function queryCargoSearch2(name: string, version: string): Promise<CargoSearch2Output> {
  let stdout = ""
  let stderr = ""

  const options = {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString()
      },
      stderr: (data: Buffer) => {
        stderr += data.toString()
      }
    }
  }

  let returnCode = await exec.exec("cargo-search2", [name, "--req", version, "--message-format", "json"], options)

  if (returnCode !== 0) {
    core.setFailed(`cargo-search2 failed with code ${returnCode}`)
    core.error(stderr)
    process.exit(returnCode)
  }

  if (stderr) {
    core.warning(`Error running cargo-search2: ${stderr}`)
  }
  return JSON.parse(stdout)
}

/** Get cache key */
export function getCacheKey(name: string, version: string, features: string[]): string {
  const runnerOs = process.env.RUNNER_OS;

  if (features.length === 0) {
    return `cargo-install-${name}-${version}-${runnerOs}`
  } else {
    return `cargo-install-${name}-${version}-${runnerOs}-features-${features.join("-")}`
  }
}

/** Run cargo install */
export async function runCargoInstall(name: string, version: string, features: string[], installPath: string): Promise<void> {
  const args = ["install", name, "--force", "--root", installPath, "--version", version]
  if (features.length > 0) {
    args.push("--features", features.join(","))
  }
  await exec.exec("cargo", args)
}
