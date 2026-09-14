import * as core from '@actions/core';
import * as semver from 'semver';
import stringArgv from 'string-argv';

// Action input parameters
export interface ActionInput {
  crates: Crate[];
  args: string[];
  cacheKey: string;
}

export interface Crate {
  name: string;
  source: RegistrySource | GitSource;
  features: string[];
}

export interface RegistrySource {
  type: 'registry';
  version: string;
  registry?: string;
  index?: string;
}

export interface GitSource {
  type: 'git';
  repository: string;
  branch?: string;
  tag?: string;
  commit?: string;
}

// Parse and validate action input
export function parseInput(): ActionInput {
  // Global parameters
  const specs = parseCrateSpecs(core.getInput('crate', { required: true }));
  const locked = core.getBooleanInput('locked', { required: false });
  const args = core.getInput('args', { required: false });
  const cacheKey = core.getInput('cache-key', { required: false });

  const parsedArgs = stringArgv(args);
  if (locked) {
    parsedArgs.push('--locked');
  }

  const crates =
    specs.length === 1
      ? [parseSingleCrate(specs[0])]
      : parseMultipleCrates(specs);

  return { crates, args: parsedArgs, cacheKey };
}

// Crate name with optional version, using the `name@version` syntax
interface CrateSpec {
  name: string;
  version?: string;
}

function parseCrateSpecs(input: string): CrateSpec[] {
  const specs = input
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(entry => {
      const [name, version, ...rest] = entry.split('@');
      if (name === '' || version === '' || rest.length > 0) {
        fail(`Invalid crate "${entry}". Expected "name" or "name@version".`);
      }
      if (version !== undefined) {
        validateVersion(version);
      }
      return { name, version };
    });

  if (specs.length === 0) {
    fail('No crate provided.');
  }
  return specs;
}

// Single crate: all inputs are supported
function parseSingleCrate(spec: CrateSpec): Crate {
  const features = core.getInput('features', { required: false });
  const parsedFeatures = features.split(/[ ,]+/).filter(Boolean);

  // Crate version (always provided, defaults to 'latest')
  const versionInput = core.getInput('version', { required: true });
  validateVersion(versionInput);
  if (spec.version !== undefined && versionInput !== 'latest') {
    fail('Cannot provide both a version in crate and the version input.');
  }
  const version = spec.version ?? versionInput;

  // Custom registry source
  const registry = core.getInput('registry', { required: false });
  const index = core.getInput('index', { required: false });
  if (registry !== '' && index !== '') {
    fail('Cannot provide both registry and index.');
  }

  // Git source (optional, overrides Crates.io version if provided)
  const repository = core.getInput('git', { required: false });
  const branch = core.getInput('branch', { required: false });
  const tag = core.getInput('tag', { required: false });
  const rev = core.getInput('rev', { required: false });
  const commit = core.getInput('commit', { required: false });

  let source: RegistrySource | GitSource;
  if (repository !== '') {
    source = { type: 'git', repository };
    source.branch = branch !== '' ? branch : undefined;
    source.tag = tag !== '' ? tag : undefined;
    source.commit = commit !== '' ? commit : rev !== '' ? rev : undefined;
  } else {
    source = { type: 'registry', version };
    source.registry = registry !== '' ? registry : undefined;
    source.index = index !== '' ? index : undefined;
  }

  // Warnings if both crates.io and git are provided
  if (
    repository === '' &&
    (branch !== '' || tag !== '' || commit !== '' || rev !== '')
  ) {
    core.warning('Ignoring branch, tag, and commit since git is not provided.');
  }
  if (repository !== '' && version !== 'latest') {
    core.warning('Ignoring version since git is provided.');
  }

  return { name: spec.name, source, features: parsedFeatures };
}

// Multiple crates: only crates.io installation with inline versions
function parseMultipleCrates(specs: CrateSpec[]): Crate[] {
  const unsupported = [
    'features',
    'registry',
    'index',
    'git',
    'branch',
    'tag',
    'commit',
    'rev',
  ].filter(name => core.getInput(name, { required: false }) !== '');
  if (core.getInput('version', { required: false }) !== 'latest') {
    unsupported.unshift('version');
  }
  if (unsupported.length > 0) {
    fail(
      `Inputs ${unsupported.join(', ')} are not supported when installing multiple crates.`,
    );
  }

  return specs.map(spec => ({
    name: spec.name,
    source: { type: 'registry', version: spec.version ?? 'latest' },
    features: [],
  }));
}

function validateVersion(version: string): void {
  if (version !== 'latest' && semver.validRange(version) === null) {
    fail(
      `Invalid version "${version}". Must be a valid semver range or "latest".`,
    );
  }
}

function fail(message: string): never {
  core.setFailed(message);
  process.exit(1);
}
