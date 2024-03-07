import * as exec from '@actions/exec'
import * as core from '@actions/core'

import type { GitSource } from '../parse'
import type { ResolvedVersion } from '../install'

interface GitRemoteCommits {
  head: string
  tags: { [tag: string]: string }
  branches: { [branch: string]: string }
}

// Resolve the Git source to a specific commit
export async function resolveGitCommit (git: GitSource): Promise<ResolvedVersion> {
  core.info(`Fetching git commits for ${git.repository}...`)
  const commits = await fetchGitRemote(git.repository)

  if (git.commit !== undefined) {
    core.info(`Using explicit commit ${git.commit} for ${git.repository}`)
    return { repository: git.repository, commit: git.commit }
  }

  if (git.tag !== undefined) {
    const commit = commits.tags[git.tag]
    if (commit === undefined) {
      core.setFailed(`Failed to resolve tag ${git.tag} for ${git.repository}`)
      process.exit(1)
    }

    core.info(`Resolved tag ${git.tag} to commit ${commit}`)
    return { repository: git.repository, commit }
  }

  if (git.branch !== undefined) {
    const commit = commits.branches[git.branch]
    if (commit === undefined) {
      core.setFailed(`Failed to resolve branch ${git.branch} for ${git.repository}`)
      process.exit(1)
    }

    core.info(`Resolved branch ${git.branch} to commit ${commit}`)
    return { repository: git.repository, commit }
  }

  core.info(`Resolved HEAD to commit ${commits.head}`)
  return { repository: git.repository, commit: commits.head }
}

async function fetchGitRemote (repository: string): Promise<GitRemoteCommits> {
  const commits: GitRemoteCommits = { head: '', tags: {}, branches: {} }

  const parseLine = (line: string): void => {
    const [commit, ref] = line.split('\t')

    if (commit === '' || ref === '' || ref === undefined) {
      return
    }

    if (ref === 'HEAD') {
      commits.head = commit
    }

    const tagMatch = 'refs/tags/'
    if (ref.startsWith(tagMatch)) {
      const tag = ref.slice(tagMatch.length)
      commits.tags[tag] = commit
    }

    const branchMatch = 'refs/heads/'
    if (ref.startsWith(branchMatch)) {
      const branch = ref.slice(branchMatch.length)
      commits.branches[branch] = commit
    }
  }

  await exec.exec('git', ['ls-remote', repository], { listeners: { stdline: parseLine }, silent: true })

  if (commits.head === '') {
    core.setFailed(`Failed to fetch HEAD commit for ${repository}`)
    process.exit(1)
  }

  return commits
}
