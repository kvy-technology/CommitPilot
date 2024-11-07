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
import { createRelease, validateRepositoryState } from '../../services/git'
import { determineNextVersion, updateChangelog } from '../../services/changelog'

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

    // Interactive version selection based on semantic versioning
    const newVersion = await determineNextVersion()

    // Generate and update changelog with AI-powered release notes
    await updateChangelog(newVersion)

    // Extract full changelog content for release annotation
    const releaseNotes = await vscode.workspace
      .openTextDocument(vscode.Uri.file('CHANGELOG.md'))
      .then((doc) => doc.getText())

    // Create git tag, commit version bump, and push changes
    await createRelease(newVersion, releaseNotes)

    vscode.window.showInformationMessage(`Successfully created release ${newVersion}`)
  } catch (error: any) {
    vscode.window.showWarningMessage(`Failed to create release: ${error.message}`)
    console.error('CommitPilot: Error creating release', error)
  }
}
