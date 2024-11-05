/**
 * PR Description Generator Command
 *
 * Provides functionality to automatically generate pull request descriptions using AI,
 * with support for interactive refinement and template integration.
 *
 * Key features:
 * - Base branch selection
 * - AI-powered description generation
 * - Interactive description refinement
 * - PR template integration
 * - Automatic PR title generation
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as vscode from 'vscode'
import { KVY_PRESET } from '../constants/preset'
import {
  getAllBranches,
  getCurrentBranch,
  getDetailedBranchDiff,
  getRepoRoot,
} from '../services/git'
import { LLMService } from '../services/llm'
import { openPRCreationPage } from '../services/vscode-scm'
import { PRTitleSchema } from '../constants/schema'
import { DEFAULT_PROMPTS } from '../constants/llm'

// User interaction options for PR description feedback
enum PRFeedbackOption {
  SUBMIT = 'Submit PR',
  IMPROVE = 'Improve Description',
  CANCEL = 'Cancel',
}

/**
 * Main function to generate PR description with interactive refinement
 * Workflow:
 * 1. Select base branch for comparison
 * 2. Generate initial description using AI
 * 3. Allow user refinement through feedback loop
 * 4. Generate PR title
 * 5. Open PR creation page
 */
export async function generatePRDescription() {
  // Get base branch for PR comparison
  const baseBranch = await selectBaseBranch()
  if (!baseBranch) {
    return
  }

  vscode.window.showInformationMessage(`Commit Pilot: Analyzing code changes in ${baseBranch}...`)

  // Gather diff data and PR template for context
  const diff = await getDetailedBranchDiff(baseBranch)
  const template = await getPRTemplate()

  const llm = new LLMService()
  const prompt = template || KVY_PRESET.GENERATE_PR_DESCRIPTION_PROMPT

  vscode.window.showInformationMessage('Commit Pilot: Generating initial PR description...')

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
            placeHolder: 'How would you like to proceed with this PR description?',
          }
        )

        if (!feedback) {
          throw new Error('closed editors')
        }

        if (feedback === PRFeedbackOption.SUBMIT) {
          isDescriptionApproved = true
          vscode.window.showInformationMessage(
            'Commit Pilot: Description approved! Generating PR title...'
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
              disableExamples: true,
            })
          }
        } else if (feedback === PRFeedbackOption.CANCEL) {
          vscode.window.showInformationMessage('Commit Pilot: PR description generation cancelled.')
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
          'Error updating PR description. Would you like to retry?',
          'Retry',
          'Cancel'
        )

        if (retry !== 'Retry') {
          vscode.window.showInformationMessage('PR description generation cancelled.')
          return
        }
      }
    }

    // Generate PR title based on approved description
    const title = await llm.generate({
      prompt: KVY_PRESET.GENERATE_PR_TITLE_PROMPT,
      schema: PRTitleSchema,
      input: {
        description,
      },
      disableExamples: true,
    })

    // Open PR creation page with generated content
    vscode.window.showInformationMessage('Commit Pilot: Opening PR creation page...')
    await openPRCreationPage(description, baseBranch, title.title)
    vscode.window.showInformationMessage(
      'Commit Pilot: PR description and title generated successfully! Ready to create PR.'
    )
  } catch (error) {
    console.error(error)
    vscode.window.showErrorMessage(`Error generating PR description: ${error}`)
  }
}

/**
 * Attempts to load PR template from repository or custom path
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
          `Could not load custom PR template from ${customTemplatePath}. Falling back to default template.`
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

/**
 * Presents user with a list of available branches for PR base
 * Excludes current branch from selection options
 * Returns selected branch name or undefined if cancelled
 */
async function selectBaseBranch() {
  try {
    const branches = await getAllBranches()
    const currentBranch = await getCurrentBranch()

    const selectableBranches = branches.filter((branch) => branch !== currentBranch)

    const selectedBranch = await vscode.window.showQuickPick(selectableBranches, {
      placeHolder: 'Select the base branch',
      title: 'Select Base Branch for PR Description',
    })

    if (!selectedBranch) {
      console.log(`CommitPilot: User cancelled the selection`)
      return
    }

    return selectedBranch
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to generate PR description: ${error}`)
  }
}
