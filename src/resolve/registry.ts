import * as http from '@actions/http-client';
import * as core from '@actions/core';
import semver from 'semver';

import type { ResolvedVersion } from '../install';
import {
  InferOutput,
  boolean,
  check,
  object,
  parse,
  string,
  pipe,
} from 'valibot';
import { RegistrySource } from '../parse';

const CrateVersionSchema = object({
  vers: pipe(
    string(),
    check(input => semver.valid(input) !== null, 'Invalid semver version'),
  ),
  yanked: boolean(),
});

type CrateVersion = InferOutput<typeof CrateVersionSchema>;

// Resolve latest compatible crate version
export async function resolveRegistryVersion(
  crate: string,
  { version, registry, index }: RegistrySource,
): Promise<ResolvedVersion> {
  const isVersionRange = semver.valid(version) === null;
  const registryIndex =
    index !== undefined
      ? parseRegistryIndex(index)
      : { sparse: true, url: 'https://index.crates.io/' };

  const nonSparseIndex = registry !== undefined || !registryIndex.sparse;
  if (isVersionRange && nonSparseIndex) {
    core.error('Version ranges can only be used with sparse indexes');
    process.exit(1);
  }
  if (!isVersionRange && nonSparseIndex) {
    core.info('Using non-sparse index, skipping version resolution');
    return { version };
  }

  return await resolveCrateVersion(crate, version, registryIndex);
}

interface RegistryIndex {
  sparse: boolean;
  url: string;
}

function parseRegistryIndex(input: string): RegistryIndex {
  const sparseProtocol = 'sparse+';
  const sparse = input.startsWith(sparseProtocol);
  const url = sparse ? input.slice(sparseProtocol.length) : input;

  return { sparse, url };
}

async function resolveCrateVersion(
  crate: string,
  version: string,
  index: RegistryIndex,
): Promise<ResolvedVersion> {
  core.info(`Fetching information for ${crate} from index ...`);
  const versions = await fetchIndex(crate, index.url);

  const sortedVersions = versions
    .sort((a, b) => semver.compare(a.vers, b.vers))
    .reverse();
  const latest =
    sortedVersions.find(ver => !ver.yanked && !semver.prerelease(ver.vers)) ??
    sortedVersions[0];

  if (version === 'latest') {
    return { version: latest.vers };
  }

  const resolved = sortedVersions.filter(ver =>
    semver.satisfies(ver.vers, version),
  );
  if (resolved.length === 0) {
    core.setFailed(`No version found for ${crate} that satisfies ${version}`);
    core.info(
      `Available versions: ${versions.map(ver => ver.vers).join(', ')}`,
    );
    process.exit(1);
  }

  const resolvedVersion = resolved.find(ver => !ver.yanked) ?? resolved[0];
  if (resolvedVersion.yanked) {
    core.warning(`Using yanked version ${resolvedVersion.vers} for ${crate}`);
  } else if (resolvedVersion.vers !== latest.vers) {
    core.warning(
      `New version for ${crate} available: ${sortedVersions[0].vers}`,
    );
  }

  return { version: resolvedVersion.vers };
}

async function fetchIndex(
  crate: string,
  indexUrl: string,
): Promise<CrateVersion[]> {
  const url = new URL(getIndexPath(crate), indexUrl);
  const client = new http.HttpClient('cargo-install-action');
  const response = await client.get(url.toString());

  if (response.message.statusCode === 404) {
    core.setFailed(`Crate ${crate} not found on crates.io index`);
    process.exit(1);
  } else if (response.message.statusCode !== 200) {
    core.setFailed(`Failed to fetch crate ${crate} on crates.io index`);
    core.info(
      `Error: ${response.message.statusMessage ?? ''} (${response.message.statusCode ?? ''})`,
    );
    process.exit(1);
  }

  const body = await response.readBody();

  return body
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => parse(CrateVersionSchema, JSON.parse(line)));
}

// Get index path for crate
// https://doc.rust-lang.org/cargo/reference/registry-index.html#index-files
function getIndexPath(crate: string): string {
  const name = crate.toLowerCase();

  if (name.length === 1) {
    return `1/${name}`;
  }
  if (name.length === 2) {
    return `2/${name}`;
  }
  if (name.length === 3) {
    return `3/${name.slice(0, 1)}/${name}`;
  }

  return `${name.slice(0, 2)}/${name.slice(2, 4)}/${name}`;
}
