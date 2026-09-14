import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

import { Chalk } from 'chalk';
import path from 'node:path';

import { type ResolvedVersion, getInstallSettings } from './install';
import { type ActionInput, type Crate, parseInput } from './parse';
import { resolveGitCommit } from './resolve/git';
import { resolveRegistryVersion } from './resolve/registry';

const chalk = new Chalk({ level: 3 });

interface Installed {
  version: string;
  cacheHit: boolean;
}

async function run(): Promise<void> {
  const input = parseInput();

  const installed: Installed[] = [];
  for (const crate of input.crates) {
    installed.push(await installCrate(crate, input));
  }

  // Outputs: `name@version` per line when installing multiple crates
  const version =
    input.crates.length === 1
      ? installed[0].version
      : input.crates
          .map((crate, i) => `${crate.name}@${installed[i].version}`)
          .join('\n');

  core.setOutput('version', version);
  core.setOutput(
    'cache-hit',
    installed.every(crate => crate.cacheHit),
  );
}

async function installCrate(
  crate: Crate,
  input: ActionInput,
): Promise<Installed> {
  // Resolve crate version and try to restore from cache
  core.startGroup(chalk.bold(`Installing ${crate.name}...`));
  const version: ResolvedVersion =
    crate.source.type === 'registry'
      ? await resolveRegistryVersion(crate.name, crate.source)
      : await resolveGitCommit(crate.source);

  const install = await getInstallSettings(crate, input, version);
  core.info('Installation settings:');
  if ('version' in version) {
    core.info(`   version: ${version.version}`);
  } else {
    core.info(`   repository: ${version.repository}`);
    core.info(`   commit: ${version.commit}`);
  }
  core.info(`   path: ${install.path}`);
  core.info(`   key: ${install.cacheKey}`);
  core.info(`   command: cargo ${install.args.join(' ')}`);

  await io.mkdirP(install.path);
  const restored = await cache.restoreCache([install.path], install.cacheKey);
  core.endGroup();

  // Check if the crate has been restored from cache
  let cacheHit = false;
  if (restored !== undefined) {
    core.info(`Restored ${crate.name} from cache.`);
    cacheHit = true;
  } else {
    // Install the crate if it wasn't restored from cache
    core.startGroup(
      `No cached version found, installing ${crate.name} using cargo...`,
    );

    const env = { ...process.env, ...install.env } as Record<string, string>;
    await exec.exec('cargo', install.args, { env });

    try {
      await cache.saveCache([install.path], install.cacheKey);
    } catch (error) {
      if (error instanceof Error) {
        core.warning(error.message);
      } else {
        core.warning('An unknown error occurred while saving the cache.');
      }
    }

    core.endGroup();
  }

  // Add the crate's binary directory to PATH
  core.addPath(path.join(install.path, 'bin'));
  core.info(`Added ${install.path}/bin to PATH.`);

  if ('version' in version) {
    core.info(chalk.green(`Installed ${crate.name} ${version.version}.`));
    return { version: version.version, cacheHit };
  }

  core.info(
    chalk.green(
      `Installed ${crate.name} from ${version.repository} at ${version.commit.slice(0, 7)}.`,
    ),
  );
  return { version: version.commit, cacheHit };
}

run().catch(error => {
  core.setFailed(error.message);
  core.info(error.stack);
});
