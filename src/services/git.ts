/**
 * Git Command Service
 *
 * Provides a wrapper around Git CLI commands for repository operations.
 * Handles workspace detection and command execution in the correct context.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { getWorkspaceFolder } from '../utils/workspace'
import { updatePackageVersion } from './changelog'

const execAsync = promisify(exec)

/**
 * Executes a Git command in the current workspace
 * @param command - Git command to execute (without 'git' prefix)
 * @returns Command output as string
 */
export const execGitCommand = async (command: string): Promise<string> => {
  const cwd = getWorkspaceFolder()
  console.log('CommitPilot: Executing git command:', command)
  const { stdout } = await execAsync(`git ${command}`, { cwd })
  console.log(`CommitPilot: Output: ${stdout}`)
  return stdout.trim()
}

/**
 * Gets diff of staged changes with special handling for lock files
 * @returns Diff output as string
 */
export const getStagedDiff = async (): Promise<string> => {
  const stagedFiles = await execGitCommand('diff --cached --name-only')

  const files = stagedFiles.split('\n').filter(Boolean)

  let diffOutput = ''

  for (const file of files) {
    if (file.endsWith('lock.json') || file.endsWith('.lock') || file.endsWith('lock.yaml')) {
      diffOutput += `${file}: [Lock file changes detected]\n`
    } else {
      const fileDiff = await execGitCommand(`diff --cached ${file}`)
      diffOutput += fileDiff + '\n'
    }
  }

  return diffOutput.trim()
}

/**
 * Lists all staged files
 * @returns Array of staged file paths
 */
export const getStagedFiles = async (): Promise<string[]> => {
  const output = await execGitCommand('diff --cached --name-only')
  return output.split('\n').filter(Boolean)
}

/**
 * Gets current branch name
 * @returns Current branch name
 */
export const getCurrentBranch = async (): Promise<string> => {
  return execGitCommand('rev-parse --abbrev-ref HEAD')
}

/**
 * Gets repository root directory
 * @returns Absolute path to repository root
 */
export const getRepoRoot = async (): Promise<string> => {
  return execGitCommand('rev-parse --show-toplevel')
}

/**
 * Retrieves recent commit history
 * @param limit - Number of commits to retrieve (default: 5)
 * @returns Array of commit objects with hash and message
 */
export const getRecentCommits = async (
  limit = 5
): Promise<Array<{ hash: string; message: string }>> => {
  const output = await execGitCommand(`log -${limit} --pretty=format:%H%n%B%n---COMMIT---`)
  return output
    .split('---COMMIT---')
    .filter(Boolean)
    .map((commit) => {
      const [hash, ...messageLines] = commit.trim().split('\n')
      return {
        hash,
        message: messageLines.join('\n').trim(),
      }
    })
}

/**
 * Lists all local branches
 * @returns Array of branch names
 */
export const getAllBranches = async (): Promise<string[]> => {
  const output = await execGitCommand('branch --format="%(refname:short)"')
  return output.split('\n').filter(Boolean)
}

/**
 * Gets detailed diff information between current branch and base branch
 * @param baseBranch - Base branch to compare against
 * @returns Array of commit objects with hash, message, and diff
 */
export const getDetailedBranchDiff = async (
  baseBranch: string
): Promise<Array<{ hash: string; message: string; diff: string }>> => {
  const commitHashes = await execGitCommand(`log ${baseBranch}...HEAD --format=%H`)
  const commits = []

  for (const hash of commitHashes.split('\n').filter(Boolean)) {
    const message = await execGitCommand(`log --pretty=format:%B -n 1 ${hash}`)
    const diff = await execGitCommand(`diff ${hash}^!`)
    commits.push({
      hash: hash.substring(0, 4),
      message: message.trim(),
      diff: diff.trim(),
    })
  }
  return commits
}

/**
 * Gets the latest release tag from git
 * @returns Latest semver tag or null if no releases exist
 */
export const getLastRelease = async (): Promise<string | null> => {
  try {
    // Get all tags sorted by version (v1.0.0, v2.0.0, etc)
    const output = await execGitCommand('tag --sort=-v:refname')
    const tags = output.split('\n').filter((tag) => tag.match(/^v\d+\.\d+\.\d+$/))

    return tags.length > 0 ? tags[0] : null
  } catch (error) {
    console.error('CommitPilot: No release tags found')
    return null
  }
}

/**
 * Syncs current branch with remote by pulling latest changes
 * @throws Error if sync fails or conflicts exist
 */
export const syncWithRemote = async (): Promise<void> => {
  const currentBranch = await getCurrentBranch()

  // Fetch latest changes from remote
  await execGitCommand('fetch origin')

  try {
    // Check if branch exists on remote
    const remoteBranchExists = await execGitCommand(`ls-remote --heads origin ${currentBranch}`)

    if (!remoteBranchExists) {
      // Branch doesn't exist on remote, push it
      await execGitCommand(`push -u origin ${currentBranch}`)
      return
    }

    // If branch exists, check if local is behind remote
    const behindCount = await execGitCommand(`rev-list HEAD..origin/${currentBranch} --count`)
    if (parseInt(behindCount) > 0) {
      await execGitCommand('pull --rebase origin ' + currentBranch)
    }
  } catch (error) {
    // If any command fails, push the branch to establish tracking
    await execGitCommand(`push -u origin ${currentBranch}`)
  }
}

/**
 * Creates an annotated Git tag with release notes
 * @param version - Version number to tag (e.g. v1.0.0)
 * @param releaseNotes - Generated release notes for tag annotation
 */
export const createGitTag = async (version: string, releaseNotes: string): Promise<void> => {
  // Escape special characters and wrap message in single quotes
  const escapedNotes = releaseNotes.replace(/'/g, "'\\''").replace(/"/g, '\\"').trim()

  // Create annotated tag with escaped release notes
  await execGitCommand(`tag -a ${version} -m '${escapedNotes}'`)

  // Push tag to remote
  await execGitCommand(`push origin ${version}`)
}

/**
 * Validates repository state for release
 * @throws Error if repository state is invalid
 */
export const validateRepositoryState = async (): Promise<void> => {
  const hasChanges = await execGitCommand('status --porcelain')
  if (hasChanges) {
    throw new Error('Repository has uncommitted changes')
  }

  const hasRemote = await execGitCommand('remote')
  if (!hasRemote) {
    throw new Error('No git remote configured for this repository')
  }
}

/**
 * Commits version bump changes
 * @param version - New version number
 */
export const commitVersionBump = async (version: string): Promise<void> => {
  await execGitCommand('add package.json CHANGELOG.md')
  await execGitCommand(`commit -m "chore: release ${version}"`)
}

/**
 * Creates and pushes release
 * @param version - Version to release
 * @param releaseNotes - Generated release notes
 */
export const createRelease = async (version: string, releaseNotes: string): Promise<void> => {
  // Update package.json version first
  await updatePackageVersion(version);

  await commitVersionBump(version)
  await createGitTag(version, releaseNotes)
  await execGitCommand(`push origin ${version}`)
  await execGitCommand('push')
}
