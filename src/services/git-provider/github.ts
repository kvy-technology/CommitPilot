/**
 * GitHub Integration Service
 * 
 * Provides functionality for interacting with GitHub's API, specifically for:
 * - Managing authentication via Personal Access Tokens
 * - Creating GitHub releases
 * - Parsing and validating GitHub repository URLs
 * 
 * This service complements the changelog and git services for release automation.
 */

import * as vscode from 'vscode'
import { execGitCommand } from '../git'


/**
 * Checks if the current repository is a GitHub repository by inspecting the remote URL.
 *
 * @returns A Promise that resolves to `true` if the current repository is hosted on GitHub, `false` otherwise.
 */
export async function isGithubRepo(): Promise<boolean> {
  const remoteUrl = await getGithubRemoteUrl()
  return remoteUrl.includes('github.com')
}

/**
 * Retrieves or prompts for GitHub Personal Access Token
 * 
 * @returns Promise resolving to GitHub PAT
 * @throws Error if user cancels token input
 */
async function getGithubToken(): Promise<string> {
  const config = vscode.workspace.getConfiguration('commitpilot')
  let token = config.get<string>('githubToken')

  if (!token) {
    token = await vscode.window.showInputBox({
      prompt: 'Enter your GitHub Personal Access Token',
      placeHolder: 'ghp_xxxxxxxxxxxxxxxx',
      password: true, // Masks token input for security
      ignoreFocusOut: true, // Prevents dialog from closing when focus is lost
      title: 'GitHub Token Required',
    })

    if (!token) {
      throw new Error('GitHub token is required to create releases')
    }

    // Persist token in user settings for subsequent operations
    await config.update('githubToken', token, true)
  }

  return token
}

/**
 * Creates a new GitHub release using the GitHub REST API
 * 
 * Release creation process:
 * 1. Authenticate using PAT
 * 2. Determine repository details from git remote
 * 3. Create release via GitHub API
 * 
 * @param version - Semantic version string (e.g., 'v1.0.0')
 * @param releaseNotes - Markdown formatted release notes
 * @throws Error if API request fails or repository URL is invalid
 */
export async function createGithubRelease(version: string, releaseNotes: string): Promise<void> {
  const token = await getGithubToken()
  const remoteUrl = await getGithubRemoteUrl()
  const { owner, repo } = parseGithubUrl(remoteUrl)

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tag_name: version,
      name: version,
      body: releaseNotes,
      draft: false,
      prerelease: false,
    }),
  })

  if (!response.ok) {
    const error = await response.json() as { message: string }
    throw new Error(`Failed to create GitHub release: ${error.message}`)
  }
}

/**
 * Extracts owner and repository name from GitHub URL
 * 
 * Supports both HTTPS and SSH URL formats:
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * 
 * @param url - GitHub repository URL
 * @returns Object containing owner and repo names
 * @throws Error if URL format is invalid
 */
function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (!match) {
    throw new Error('Invalid GitHub repository URL')
  }
  return { owner: match[1], repo: match[2] }
}

/**
 * Retrieves the GitHub remote URL for the repository
 * 
 * @param repoRoot - Absolute path to repository root
 * @returns Promise resolving to repository's remote URL
 */
async function getGithubRemoteUrl(): Promise<string> {
  const remoteUrl = await execGitCommand('remote get-url origin')
  return remoteUrl
}

