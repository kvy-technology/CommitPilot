/**
 * Git Command Service
 * 
 * Provides a wrapper around Git CLI commands for repository operations.
 * Handles workspace detection and command execution in the correct context.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as vscode from 'vscode'

const execAsync = promisify(exec)

/**
 * Retrieves the current workspace folder path
 * @throws Error if no workspace is open
 */
const getWorkspaceFolder = (): string => {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders) {
    throw new Error('No workspace folder found')
  }
  return workspaceFolders[0].uri.fsPath
}

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
export const getDetailedBranchDiff = async (baseBranch: string): Promise<Array<{ hash: string; message: string; diff: string }>> => {
  const commitHashes = await execGitCommand(`log ${baseBranch}...HEAD --format=%H`)
  const commits = []

  for (const hash of commitHashes.split('\n').filter(Boolean)) {
    const message = await execGitCommand(`log --pretty=format:%B -n 1 ${hash}`)
    const diff = await execGitCommand(`diff ${hash}^!`)
    commits.push({
      hash: hash.substring(0, 4),
      message: message.trim(),
      diff: diff.trim()
    })
  }
  return commits
}
