/**
 * Commit Message Generation Commands
 * 
 * Provides AI-powered commit message generation in two formats:
 * 1. Full format: type, description, and detailed body
 * 2. Simple format: type and description only
 * 
 * Uses staged changes to generate contextually relevant messages
 * following conventional commit standards.
 */

import * as vscode from 'vscode'
import { getStagedDiff, getStagedFiles } from '../services/git'
import { LLMService } from '../services/llm'
import { writeCommitMessageToSCM } from '../services/vscode-scm'
import { KVY_PRESET } from '../constants/preset'
import { fullCommitSchema, simpleCommitSchema } from '../constants/schema'

/**
 * Generates a detailed commit message with type, description, and body
 * - Analyzes staged changes
 * - Uses AI to generate structured message
 * - Updates SCM input box with result
 */
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

    // Generate structured commit message using AI
    const result = await llmService.generate({
      prompt: KVY_PRESET.GENERATE_COMMIT_PROMPT,
      schema: fullCommitSchema,
      input: { diff }
    })

    // Format message with conventional commit structure
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

/**
 * Generates a simple commit message with type and description only
 * - Ideal for small, straightforward changes
 * - Follows conventional commit format
 * - Updates SCM input box with result
 */
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

    // Generate concise commit message using AI
    const result = await llmService.generate({
      prompt: KVY_PRESET.GENERATE_COMMIT_PROMPT,
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
