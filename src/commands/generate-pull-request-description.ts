/**
 * Pull request Description Generator Command
 *
 * Provides functionality to automatically generate pull request descriptions using AI,
 * with support for interactive refinement and template integration.
 *
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as vscode from 'vscode'
import { DEFAULT_PROMPTS } from '../constants/llm'
import { KVY_PRESET } from '../constants/preset'
import { PRTitleSchema } from '../constants/schema'
import {
  createDefaultChangelog,
  isChangelogExists,
  openChangelogFile,
  updateUnreleasedChangelog,
} from '../services/changelog'
import { getDetailedBranchDiff, getRepoRoot } from '../services/git'
import { LLMService } from '../services/llm'
import { openPRCreationPage, selectBaseBranch } from '../services/vscode-scm'
import { delay } from '../utils'

// User interaction options for pull request description feedback
enum PRFeedbackOption {
  SUBMIT = 'Submit Pull Request',
  IMPROVE = 'Improve Description',
  CANCEL = 'Cancel',
}

enum ChangelogFeedbackOption {
  SUBMIT = 'Save Changelog',
  IMPROVE = 'Improve Changelog',
  CANCEL = 'Cancel',
}

/**
 * Main function to generate pull request description with interactive refinement
 * Workflow:
 * 1. Select base branch for comparison
 * 2. Generate initial description using AI
 * 3. Allow user refinement through feedback loop
 * 4. Generate pull request title
 * 5. Open pull request creation page
 */
export async function generatePRDescription() {
  // Get base branch for pull request comparison
  const baseBranch = await selectBaseBranch()
  if (!baseBranch) {
    return
  }

  vscode.window.showInformationMessage(`Commit Pilot: Analyzing code changes in ${baseBranch}...`)

  // Gather diff data and pull request template for context
  const diff = await getDetailedBranchDiff(baseBranch)
  const template = await getPRTemplate()

  const llm = new LLMService()
  const prompt = template || KVY_PRESET.GENERATE_PR_DESCRIPTION_PROMPT

  vscode.window.showInformationMessage(
    'Commit Pilot: Generating initial pull request description...'
  )

  try {
    // Initial description generation using AI
    let description = await llm.generate({
      prompt,
      input: {
        diff: JSON.stringify(diff, null, 2),
      },
      disableExamples: true,
    })

    // Interactive refinement loop
    vscode.window.showInformationMessage('Commit Pilot: Opening description for review...')
    const document = await vscode.workspace.openTextDocument({
      content: description,
      language: 'markdown',
    })

    let editor = await vscode.window.showTextDocument(document)

    // Feedback loop for description refinement
    let isDescriptionApproved = false
    while (!isDescriptionApproved) {
      try {
        // Ensure editor is active and visible
        let isEditorActive = vscode.window.activeTextEditor === editor
        if (!isEditorActive) {
          editor = await vscode.window.showTextDocument(document)
        }

        // Update description content
        await editor.edit((editBuilder) => {
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          )
          editBuilder.replace(fullRange, description)
        })

        const feedback = await vscode.window.showQuickPick(
          [PRFeedbackOption.SUBMIT, PRFeedbackOption.IMPROVE, PRFeedbackOption.CANCEL],
          {
            placeHolder: 'How would you like to proceed with this pull request description?',
          }
        )

        if (!feedback) {
          throw new Error('closed editors')
        }

        if (feedback === PRFeedbackOption.SUBMIT) {
          isDescriptionApproved = true
          vscode.window.showInformationMessage(
            'Commit Pilot: Description approved! Generating pull request title...'
          )
        } else if (feedback === PRFeedbackOption.IMPROVE) {
          // Handle description refinement based on user feedback
          const refinementInput = await vscode.window.showInputBox({
            prompt: 'What would you like to improve in the description?',
            placeHolder: 'Enter your feedback for refinement',
          })

          if (refinementInput) {
            vscode.window.showInformationMessage(
              'Commit Pilot: Refining description based on feedback...'
            )
            description = await llm.generate({
              prompt: DEFAULT_PROMPTS.REFINE_PR_DESCRIPTION_PROMPT,
              input: {
                refinementInput,
                description,
              },
            })
          }
        } else if (feedback === PRFeedbackOption.CANCEL) {
          vscode.window.showInformationMessage(
            'Commit Pilot: pull request description generation cancelled.'
          )
          return
        }
      } catch (error) {
        // Handle specific error cases
        if (error instanceof Error && error.message.includes('closed editors')) {
          vscode.window.showWarningMessage('PR description editor was closed. Reopening...')
          editor = await vscode.window.showTextDocument(document)
          continue
        }

        // Give user option to retry or cancel
        const retry = await vscode.window.showErrorMessage(
          'Error updating pull request description. Would you like to retry?',
          'Retry',
          'Cancel'
        )

        if (retry !== 'Retry') {
          vscode.window.showInformationMessage('PR description generation cancelled.')
          return
        }
      }
    }

    // Generate pull request title based on approved description
    const title = await llm.generate({
      prompt: KVY_PRESET.GENERATE_PR_TITLE_PROMPT,
      schema: PRTitleSchema,
      input: {
        description,
      },
      disableExamples: true,
    })

    // Open pull request creation page with generated content
    vscode.window.showInformationMessage('Commit Pilot: Opening pull request creation page...')
    await openPRCreationPage(description, baseBranch, title.title)
    vscode.window.showInformationMessage(
      'Commit Pilot: Pull request description and title generated successfully! Ready to create Pull request.'
    )

    // Close the pull request creation page
    closeTemporaryDocuments()

    try {
      await delay(1000)
      // Update changelog

      const isProjectHasChangelog = await isChangelogExists()

      if (!isProjectHasChangelog) {
        const shouldCreateDefaultChangelog = await vscode.window.showWarningMessage(
          'No CHANGELOG.md found. Would you like to create a default one?',
          'Yes',
          'No'
        )
        if (shouldCreateDefaultChangelog === 'Yes') {
          await createDefaultChangelog()
        } else {
          return
        }
      }

      // If changelog exists, ask for confirmation
      const shouldUpdate = await vscode.window.showInformationMessage(
        'Would you like to update the changelog?',
        'Yes',
        'No'
      )

      if (shouldUpdate === 'Yes') {
        await generateChangelogFeedbackLoop({
          pullRequestDescription: description,
          diff,
        })
      } else {
        return
      }
    } catch (error) {
      console.error(error)
      vscode.window.showErrorMessage(`Commit Pilot: Error generating changelog: ${error}`)
    }
  } catch (error) {
    console.error(error)
    vscode.window.showErrorMessage(`Error generating pull request description: ${error}`)
  }
}

/**
 * Attempts to load pull request template from repository or custom path
 * Falls back to default GitHub template if not found
 */
async function getPRTemplate(): Promise<string | null> {
  try {
    const repoRoot = await getRepoRoot()
    const config = vscode.workspace.getConfiguration('commitPilot')
    const customTemplatePath = config.get<string>('customPullRequestTemplate')

    // Try custom template first if configured
    if (customTemplatePath) {
      const fullCustomPath = path.join(repoRoot, customTemplatePath)
      try {
        const template = await fs.readFile(fullCustomPath, 'utf-8')
        return DEFAULT_PROMPTS.GET_PR_TEMPLATE_PROMPT.replace('{template}', template)
      } catch (error) {
        vscode.window.showWarningMessage(
          `Could not load custom pull request template from ${customTemplatePath}. Falling back to default template.`
        )
      }
    }

    // Fall back to default GitHub template location
    const defaultTemplatePath = path.join(repoRoot, '.github', 'PULL_REQUEST_TEMPLATE.md')
    const template = await fs.readFile(defaultTemplatePath, 'utf-8')
    return DEFAULT_PROMPTS.GET_PR_TEMPLATE_PROMPT.replace('{template}', template)
  } catch {
    return null
  }
}

async function generateChangelogFeedbackLoop({
  pullRequestDescription,
  diff,
}: {
  pullRequestDescription: string
  diff: any[]
}) {
  vscode.window.showInformationMessage('Commit Pilot: Generating changelog entries...')

  const llm = new LLMService()

  let changelogEntries = await llm.generate({
    prompt: KVY_PRESET.GENERATE_CHANGELOG_PROMPT,
    input: {
      description: pullRequestDescription,
      commits: diff.map((commit) => `${commit.hash}: ${commit.message}`).join('\n'),
    },
  })

  const document = await vscode.workspace.openTextDocument({
    content: changelogEntries,
    language: 'markdown',
  })

  let editor = await vscode.window.showTextDocument(document)
  // Start changelog feedback loop
  let isChangelogApproved = false

  while (!isChangelogApproved) {
    // Ensure editor is active and visible
    let isEditorActive = vscode.window.activeTextEditor === editor
    if (!isEditorActive) {
      editor = await vscode.window.showTextDocument(document)
    }

    // Update description content
    await editor.edit((editBuilder) => {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      )
      editBuilder.replace(fullRange, changelogEntries)
    })

    const feedback = await vscode.window.showQuickPick(
      [
        ChangelogFeedbackOption.SUBMIT,
        ChangelogFeedbackOption.IMPROVE,
        ChangelogFeedbackOption.CANCEL,
      ],
      {
        placeHolder: 'How would you like to proceed with the changelog entries?',
      }
    )

    if (feedback === ChangelogFeedbackOption.SUBMIT) {
      isChangelogApproved = true
      await updateUnreleasedChangelog(changelogEntries)
      // Close the changelog window
      closeTemporaryDocuments()

      // Wait for the changelog window to close
      await delay(1000)

      // Open the changelog file
      openChangelogFile()
    } else if (feedback === ChangelogFeedbackOption.IMPROVE) {
      const refinementInput = await vscode.window.showInputBox({
        prompt: 'What would you like to improve in the changelog?',
        placeHolder: 'Enter your feedback for refinement',
      })

      if (refinementInput) {
        changelogEntries = await llm.generate({
          prompt: KVY_PRESET.REFINE_CHANGELOG_PROMPT,
          input: {
            refinementInput,
            currentChangelog: changelogEntries,
            description: pullRequestDescription,
            diff: JSON.stringify(diff, null, 2),
          },
        })
      }
    } else if (feedback === ChangelogFeedbackOption.CANCEL) {
      vscode.window.showInformationMessage('Commit Pilot: Update Changelog cancelled')
      return
    }
  }
}

function closeTemporaryDocuments() {
  // Close the editor and dispose of the document
  vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor')
}
