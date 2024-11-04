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

enum PRFeedbackOption {
  SUBMIT = 'Submit PR',
  IMPROVE = 'Improve Description',
  CANCEL = 'Cancel'
}

export async function generatePRDescription() {
  const baseBranch = await selectBaseBranch()
  if (!baseBranch) {
    return
  }

  vscode.window.showInformationMessage(`Commit Pilot: Analyzing code changes in ${baseBranch}...`)

  const diff = await getDetailedBranchDiff(baseBranch)
  const template = await getPRTemplate()

  const llm = new LLMService()
  const prompt = template || KVY_PRESET.GENERATE_PR_DESCRIPTION_PROMPT

  vscode.window.showInformationMessage('Commit Pilot: Generating initial PR description...')

  try {
    let description = await llm.generate({
      prompt,
      input: {
        diff: JSON.stringify(diff, null, 2)
      },
      disableExamples: true
    })

    vscode.window.showInformationMessage('Commit Pilot: Opening description for review...')
    const document = await vscode.workspace.openTextDocument({
      content: description,
      language: 'markdown'
    })
    const editor = await vscode.window.showTextDocument(document)

    let isDescriptionApproved = false
    while (!isDescriptionApproved) {
      await editor.edit(editBuilder => {
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        )
        editBuilder.replace(fullRange, description)
      })

      const feedback = await vscode.window.showQuickPick(
        [PRFeedbackOption.SUBMIT, PRFeedbackOption.IMPROVE, PRFeedbackOption.CANCEL],
        {
          placeHolder: 'How would you like to proceed with this PR description?'
        }
      )

      if (feedback === PRFeedbackOption.SUBMIT) {
        isDescriptionApproved = true
        vscode.window.showInformationMessage('Commit Pilot: Description approved! Generating PR title...')
      } else if (feedback === PRFeedbackOption.IMPROVE) {
        const refinementInput = await vscode.window.showInputBox({
          prompt: 'What would you like to improve in the description?',
          placeHolder: 'Enter your feedback for refinement'
        })

        if (refinementInput) {
          vscode.window.showInformationMessage('Commit Pilot: Refining description based on feedback...')
          description = await llm.generate({
            prompt: DEFAULT_PROMPTS.REFINE_PR_DESCRIPTION_PROMPT,
            input: {
              refinementInput,
              description
            },
            disableExamples: true
          })
        }
      } else if (feedback === PRFeedbackOption.CANCEL) {
        vscode.window.showInformationMessage('Commit Pilot: PR description generation cancelled.')
        return
      }
    }

    const title = await llm.generate({
      prompt: KVY_PRESET.GENERATE_PR_TITLE_PROMPT,
      schema: PRTitleSchema,
      input: {
        description
      },
      disableExamples: true
    })

    vscode.window.showInformationMessage('Commit Pilot: Opening PR creation page...')
    await openPRCreationPage(description, baseBranch, title.title)
    vscode.window.showInformationMessage('Commit Pilot: PR description and title generated successfully! Ready to create PR.')
  } catch (error) {
    console.error(error)
    vscode.window.showErrorMessage(`Error generating PR description: ${error}`)
  }
}

async function getPRTemplate(): Promise<string | null> {
  try {
    const repoRoot = await getRepoRoot()
    const templatePath = path.join(repoRoot, '.github', 'PULL_REQUEST_TEMPLATE.md')
    const template = await fs.readFile(templatePath, 'utf-8')

    return DEFAULT_PROMPTS.GET_PR_TEMPLATE_PROMPT.replace('{template}', template)
  } catch {
    return null
  }
}

async function selectBaseBranch() {
  try {
    const branches = await getAllBranches()
    const currentBranch = await getCurrentBranch()

    // Filter out current branch from the list
    const selectableBranches = branches.filter((branch) => branch !== currentBranch)

    const selectedBranch = await vscode.window.showQuickPick(selectableBranches, {
      placeHolder: 'Select the base branch',
      title: 'Select Base Branch for PR Description',
    })

    if (!selectedBranch) {
      console.log(`CommitPilot: User cancelled the selection`)
      return // User cancelled the selection
    }

    // We'll continue with the diff generation in the next step
    return selectedBranch
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to generate PR description: ${error}`)
  }
}
