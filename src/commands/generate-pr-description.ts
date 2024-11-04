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

export async function generatePRDescription() {
  const baseBranch = await selectBaseBranch()
  if (!baseBranch) {
    return
  }

  vscode.window.showInformationMessage(`Generating PR description for ${baseBranch}...`)

  const diff = await getDetailedBranchDiff(baseBranch)
  const template = await getPRTemplate()
  const llm = new LLMService()
  const prompt = template || KVY_PRESET.GENERATE_PR_DESCRIPTION_PROMPT

  let description = await llm.generate({
    prompt,
    input: {
      diff: JSON.stringify(diff, null, 2)
    },
    disableExamples: true
  })

  // Create the document once
  const document = await vscode.workspace.openTextDocument({
    content: description,
    language: 'markdown'
  })
  const editor = await vscode.window.showTextDocument(document)

  let isDescriptionApproved = false
  while (!isDescriptionApproved) {
    // Update existing document content
    await editor.edit(editBuilder => {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      )
      editBuilder.replace(fullRange, description)
    })

    const feedback = await vscode.window.showQuickPick(['OK', 'Refine'], {
      placeHolder: 'Is this description good enough?'
    })

    if (feedback === 'OK') {
      isDescriptionApproved = true
    } else if (feedback === 'Refine') {
      const refinementInput = await vscode.window.showInputBox({
        prompt: 'What would you like to improve in the description?',
        placeHolder: 'Enter your feedback for refinement'
      })

      if (refinementInput) {
        description = await llm.generate({
          prompt: `Please refine the following PR description based on this feedback: ${refinementInput}\n\nCurrent description:\n${description}`,
          input: {
            diff: JSON.stringify(diff, null, 2)
          },
          disableExamples: true
        })
      }
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

  await openPRCreationPage(description, baseBranch, title.title)
  vscode.window.showInformationMessage('PR description generated successfully!')
}
async function getPRTemplate(): Promise<string | null> {
  try {
    const repoRoot = await getRepoRoot()
    const templatePath = path.join(repoRoot, '.github', 'PULL_REQUEST_TEMPLATE.md')
    const template = await fs.readFile(templatePath, 'utf-8')
    return template
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
