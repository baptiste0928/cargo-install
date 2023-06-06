import * as exec from '@actions/exec'
import * as core from '@actions/core'

import type { GitSource } from '../parse'
import type { ResolvedVersion } from '../install'

interface GitRemoteRevs {
  head: string
  tags: { [tag: string]: string }
  branches: { [branch: string]: string }
}

// Resolve the Git source to a specific revision (commit hash)
export async function resolveGitRev (git: GitSource): Promise<ResolvedVersion> {
  core.info(`Fetching git revisions for ${git.repository}...`)
  const revs = await fetchGitRemote(git.repository)

  if (git.rev !== undefined) {
    core.info(`Using explicit revision ${git.rev} for ${git.repository}`)
    return { repository: git.repository, rev: git.rev }
  }

  if (git.tag !== undefined) {
    const rev = revs.tags[git.tag]
    if (rev === undefined) {
      core.setFailed(`Failed to resolve tag ${git.tag} for ${git.repository}`)
      process.exit(1)
    }

    core.info(`Resolved tag ${git.tag} to revision ${rev}`)
    return { repository: git.repository, rev }
  }

  if (git.branch !== undefined) {
    const rev = revs.branches[git.branch]
    if (rev === undefined) {
      core.setFailed(`Failed to resolve branch ${git.branch} for ${git.repository}`)
      process.exit(1)
    }

    core.info(`Resolved branch ${git.branch} to revision ${rev}`)
    return { repository: git.repository, rev }
  }

  core.info(`Resolved HEAD to revision ${revs.head}`)
  return { repository: git.repository, rev: revs.head }
}

async function fetchGitRemote (repository: string): Promise<GitRemoteRevs> {
  const commandOutput = await exec.getExecOutput('git', ['ls-remote', repository])
  const revs: GitRemoteRevs = { head: '', tags: {}, branches: {} }

  const lines = commandOutput.stdout.split('\n')
  for (const line of lines) {
    const [rev, ref] = line.split('\t')

    if (ref === 'HEAD') {
      revs.head = rev
    }

    const tagMatch = 'refs/tags/'
    if (ref.startsWith(tagMatch)) {
      const tag = ref.slice(tagMatch.length)
      revs.tags[tag] = rev
    }

    const branchMatch = 'refs/heads/'
    if (ref.startsWith(branchMatch)) {
      const branch = ref.slice(branchMatch.length)
      revs.branches[branch] = rev
    }
  }

  if (revs.head === '') {
    core.setFailed(`Failed to fetch HEAD revision for ${repository}`)
    process.exit(1)
  }

  return revs
}
