/**
 * VS Code Source Control Integration Service
 * 
 * Provides integration with VS Code's built-in SCM providers
 * and handles repository interactions for commit messages and PR creation.
 * Supports multiple remote repository hosts (GitHub, GitLab, Bitbucket).
 */

import * as vscode from 'vscode'
import { getAllBranches, getCurrentBranch } from './git'

/**
 * Retrieves VS Code's built-in Git extension API
 * @returns Git extension API instance or undefined if not available
 */
export function getGitExtension() {
  const vscodeGit = vscode.extensions.getExtension('vscode.git')
  const gitExtension = vscodeGit && vscodeGit.exports
  return gitExtension && gitExtension.getAPI(1)
}

/**
 * Gets the primary SCM repository for the workspace
 * @returns First available repository or undefined
 */
export function getSCMRepository() {
  const gitExtension = getGitExtension()
  if (!gitExtension) {
    return
  }
  const repositories = gitExtension.repositories
  if (repositories.length === 0) {
    return
  }
  return repositories[0]
}

/**
 * Updates the SCM input box with generated commit message
 * @param message - Commit message to be written
 */
export function writeCommitMessageToSCM(message: string) {
  try {
    const repository = getSCMRepository()

    if (!repository) {
      return
    }

    repository.inputBox.value = message
  } catch (error) {
    console.error('CommitPilot: Error writing commit message to SCM', error)
  }
}

/**
 * Opens PR creation page in the default browser
 * Supports GitHub, GitLab, and Bitbucket repositories
 * Copies description to clipboard for easy pasting
 * 
 * @param description - Generated PR description
 * @param baseBranch - Target branch for PR
 * @param title - PR title
 */
export async function openPRCreationPage(description: string, baseBranch: string, title: string) {
  const repository = getSCMRepository()
  if (!repository) return

  const remote = repository.state.remotes[0]?.fetchUrl
  if (!remote) return

  const currentBranch = repository.state.HEAD?.name
  const encodedTitle = encodeURIComponent(title)
  const defaultBody = 'Paste the content from your clipboard here'

  // Copy description to clipboard for manual pasting
  await vscode.env.clipboard.writeText(description)

  let prUrl: string

  // Generate appropriate PR URL based on remote host
  if (remote.includes('github.com')) {
    const webUrl = remote.replace('git@github.com:', 'https://github.com/').replace('.git', '')
    prUrl = `${webUrl}/compare/${baseBranch}...${currentBranch}?expand=1&title=${encodedTitle}&body=${encodeURIComponent(defaultBody)}`
  } else if (remote.includes('gitlab.com')) {
    const webUrl = remote.replace('git@gitlab.com:', 'https://gitlab.com/').replace('.git', '')
    prUrl = `${webUrl}/-/merge_requests/new?merge_request[source_branch]=${currentBranch}&merge_request[target_branch]=${baseBranch}&merge_request[title]=${encodedTitle}&merge_request[description]=${encodeURIComponent(defaultBody)}`
  } else if (remote.includes('bitbucket.org')) {
    const webUrl = remote
      .replace('git@bitbucket.org:', 'https://bitbucket.org/')
      .replace('.git', '')
    prUrl = `${webUrl}/pull-requests/new?source=${currentBranch}&dest=${baseBranch}&title=${encodedTitle}&description=${encodeURIComponent(defaultBody)}`
  } else {
    // Fallback for unsupported remote hosts
    const document = await vscode.workspace.openTextDocument({
      content: description,
      language: 'markdown',
    })
    await vscode.window.showTextDocument(document)
    return
  }

  vscode.window.showInformationMessage(
    'PR description copied to clipboard! Opening PR creation page...'
  )
  await vscode.env.openExternal(vscode.Uri.parse(prUrl))
}


/**
 * Prompts the user to select a base branch for a pull request from a list of available branches, excluding the current branch.
 *
 * @returns {Promise<string | undefined>} The selected base branch, or `undefined` if the user cancels the selection.
 */
export async function selectBaseBranch() {
  try {
    const branches = await getAllBranches()
    const currentBranch = await getCurrentBranch()

    const selectableBranches = branches.filter((branch) => branch !== currentBranch)

    const selectedBranch = await vscode.window.showQuickPick(selectableBranches, {
      placeHolder: 'Select the base branch',
      title: 'Select the base branch which the current branch will be compared to',
    })

    if (!selectedBranch) {
      console.log(`CommitPilot: User cancelled the selection`)
      return
    }

    return selectedBranch
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to generate pull request description: ${error}`)
  }
}
