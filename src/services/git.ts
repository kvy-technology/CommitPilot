import { exec } from 'child_process'
import { promisify } from 'util'
import * as vscode from 'vscode'

const execAsync = promisify(exec)

const getWorkspaceFolder = (): string => {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders) {
    throw new Error('No workspace folder found')
  }
  return workspaceFolders[0].uri.fsPath
}

export const execGitCommand = async (command: string): Promise<string> => {
  const cwd = getWorkspaceFolder()
  console.log('CommitPilot: Executing git command:', cwd)
  const { stdout } = await execAsync(`git ${command}`, { cwd })
  return stdout.trim()
}

export const getStagedDiff = async (): Promise<string> => {
  return execGitCommand('diff --cached')
}

export const getStagedFiles = async (): Promise<string[]> => {
  const output = await execGitCommand('diff --cached --name-only')
  return output.split('\n').filter(Boolean)
}

export const getCurrentBranch = async (): Promise<string> => {
  return execGitCommand('rev-parse --abbrev-ref HEAD')
}

export const getRepoRoot = async (): Promise<string> => {
  return execGitCommand('rev-parse --show-toplevel')
}

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
