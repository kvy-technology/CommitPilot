/**
 * API Key Configuration Command
 * 
 * Handles secure storage of LLM provider API keys in VS Code's global settings.
 * Supports multiple providers (OpenAI, Groq) with provider-specific prompts.
 */

import * as vscode from 'vscode'

/**
 * Command handler for API key configuration
 * - Retrieves current provider from settings
 * - Prompts for API key input with secure field
 * - Stores key in global VS Code settings
 * - Provides user feedback on successful storage
 */
export async function setApiKey() {
  const provider = vscode.workspace.getConfiguration('commitPilot').get('provider') as string
  const key = await vscode.window.showInputBox({
    prompt: `Enter your ${provider?.toUpperCase()} API key`,
    password: true, // Ensures key is not visible while typing
    ignoreFocusOut: true, // Maintains focus until input is complete
  })

  if (key) {
    // Store API key in global settings for persistence
    await vscode.workspace.getConfiguration('commitPilot').update('apiKey', key, true)
    vscode.window.showInformationMessage(`${provider?.toUpperCase()} API key has been saved`)
  }
}
