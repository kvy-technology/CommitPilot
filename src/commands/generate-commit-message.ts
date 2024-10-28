import * as vscode from 'vscode'
import { getStagedDiff, getStagedFiles } from '../services/git'
import { LLMService } from '../services/llm'
import { writeCommitMessageToSCM } from '../services/vscode-scm'
import { KVY_PRESET } from '../constants/preset'
import { fullCommitSchema, simpleCommitSchema } from '../constants/schema'


export async function generateFullCommitMessage() {
  try {
    const diff = await getStagedDiff()
    const files = await getStagedFiles()
    if (!diff) {
      vscode.window.showWarningMessage('No staged changes found')
      return
    }

    vscode.window.showInformationMessage(`Generating commit message for ${files.length} files...`)

    const llmService = new LLMService()

    const result = await llmService.generate({
      prompt: KVY_PRESET.PROMPT,
      schema: fullCommitSchema,
      input: { diff }
    })

    const message = `${result.type}: ${result.description}`
    const commitMessage = result.body
      ? `${message}\n\n${result.body.map((item: string) => `- ${item}`).join('\n')}`
      : message

    writeCommitMessageToSCM(commitMessage)
    vscode.window.showInformationMessage('Commit message generated successfully!')
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating commit message: ${error}`)
  }
}

export async function generateSimpleCommitMessage() {
  try {
    const diff = await getStagedDiff()
    const files = await getStagedFiles()
    if (!diff) {
      vscode.window.showWarningMessage('No staged changes found')
      return
    }

    vscode.window.showInformationMessage(`Generating simple commit message for ${files.length} files...`)

    const llmService = new LLMService()

    const result = await llmService.generate({
      prompt: KVY_PRESET.PROMPT,
      schema: simpleCommitSchema,
      input: { diff }
    })

    const commitMessage = `${result.type}: ${result.description}`

    writeCommitMessageToSCM(commitMessage)
    vscode.window.showInformationMessage('Simple commit message generated successfully!')
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating commit message: ${error}`)
  }
}
