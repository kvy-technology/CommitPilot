/**
 * Release Creation Command
 *
 * Orchestrates the automated release process by:
 * 1. Validating repository state (no uncommitted changes)
 * 2. Determining the next semantic version
 * 3. Updating the changelog with new release notes
 * 4. Creating and pushing git tags and release commits
 *
 * Integrates with VS Code's UI for version selection and error handling
 */
import * as vscode from 'vscode'
import { createRelease, syncWithRemote, validateRepositoryState } from '../services/git'
import { determineNextVersion, updateChangelog } from '../services/changelog'
import { createGithubRelease, isGithubRepo } from '../services/git-provider/github'

/**
 * Main function to create a new release
 * @throws {Error} When repository state is invalid or release creation fails
 * @fires vscode.window.showInformationMessage On successful release
 * @fires vscode.window.showWarningMessage On release failure
 */
export async function createReleaseCommand() {
  try {
    // Ensure repository is in clean state before proceeding
    await validateRepositoryState()

    // Sync with remote before creating release
    await syncWithRemote()
    vscode.window.showInformationMessage(`Commit Pilot: Synced with remote`)


    // Interactive version selection based on semantic versioning
    const newVersion = await determineNextVersion()
    vscode.window.showInformationMessage(`Commit Pilot: Updating changelog for ${newVersion}...`)

    // Extract full changelog content for release annotation
    const releaseNotes = await updateChangelog(newVersion)
    vscode.window.showInformationMessage(`Creating tag ${newVersion} and pushing changes...`)

    // Create git tag, commit version bump, and push changes
    await createRelease(newVersion, releaseNotes)

    const isRepoIsGithub = await isGithubRepo()

    if (isRepoIsGithub) {
      vscode.window.showInformationMessage(`ommit Pilot: Detected GitHub repository. Creating GitHub release ${newVersion}...`)
      await createGithubRelease(newVersion, releaseNotes)
    }

    vscode.window.showInformationMessage(`Commit Pilot: Successfully created release ${newVersion}`)
  } catch (error: any) {
    vscode.window.showErrorMessage(`Commit Pilot: Failed to create release: ${error.message}`)
    console.error('CommitPilot: Error creating release', error)
  }
}
