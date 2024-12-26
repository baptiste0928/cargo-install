import * as core from '@actions/core';
import * as semver from 'semver';
import stringArgv from 'string-argv';

// Action input parameters
export interface ActionInput {
  crate: string;
  source: RegistrySource | GitSource;
  features: string[];
  args: string[];
  cacheKey: string;
  sharedKey: string;
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
  const crate = core.getInput('crate', { required: true });
  const features = core.getInput('features', { required: false });
  const locked = core.getBooleanInput('locked', { required: false });
  const args = core.getInput('args', { required: false });
  const cacheKey = core.getInput('cache-key', { required: false });
  const sharedKey = core.getInput('shared-key', { required: false });

  const parsedArgs = stringArgv(args);
  const parsedFeatures = features.split(/[ ,]+/).filter(Boolean);
  if (locked) {
    parsedArgs.push('--locked');
  }

  // Crate version (always provided, defaults to 'latest')
  const version = core.getInput('version', { required: true });
  if (version !== 'latest' && semver.validRange(version) === null) {
    core.setFailed(
      'Invalid version provided. Must be a valid semver range or "latest".',
    );
    process.exit(1);
  }

  // Custom registry source
  const registry = core.getInput('registry', { required: false });
  const index = core.getInput('index', { required: false });
  if (registry !== '' && index !== '') {
    core.setFailed('Cannot provide both registry and index.');
    process.exit(1);
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

  return {
    crate,
    source,
    features: parsedFeatures,
    args: parsedArgs,
    cacheKey,
    sharedKey,
  };
}
