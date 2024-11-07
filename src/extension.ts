/**
 * CommitPilot Extension Entry Point
 * 
 * Manages the lifecycle and command registration for the CommitPilot extension.
 * Integrates AI-powered commit message generation and PR automation features
 * into VS Code's command palette.
 */

import 'dotenv/config'
import * as vscode from 'vscode'
import {
	generateFullCommitMessage,
	generateSimpleCommitMessage,
} from './commands/generate-commit-message'
import { COMMANDS } from './constants/commands'
import { setApiKey } from './commands/set-api-key'
import { generatePRDescription } from './commands/generate-pr-description'
import { openSettings } from './commands/open-settings'
import { createReleaseCommand } from './commands/create-release'

/**
 * Extension Activation Handler
 * Registers all command handlers and their disposables
 * @param context - VS Code extension context for managing subscriptions
 */
export function activate(context: vscode.ExtensionContext) {
	// Register command handlers for commit message generation
	const fullCommitDisposable = vscode.commands.registerCommand(
		COMMANDS.GENERATE_FULL_COMMIT_MESSAGE,
		generateFullCommitMessage
	)

	const simpleCommitDisposable = vscode.commands.registerCommand(
		COMMANDS.GENERATE_SIMPLE_COMMIT_MESSAGE,
		generateSimpleCommitMessage
	)

	// Register API key configuration command
	const setApiKeyDisposable = vscode.commands.registerCommand(COMMANDS.SET_API_KEY, setApiKey)

	// Register PR description generation command
	const generatePRDescriptionDisposable = vscode.commands.registerCommand(
		COMMANDS.GENERATE_PR_DESCRIPTION,
		generatePRDescription
	)

	// Register Open Settings command
	const openSettingsDisposable = vscode.commands.registerCommand(
		COMMANDS.OPEN_SETTINGS,
		openSettings
	)

	// Register Create Release command
	const createReleaseDisposable = vscode.commands.registerCommand(
		COMMANDS.CREATE_RELEASE,
		createReleaseCommand
	)

	// Add all disposables to extension context for proper cleanup
	context.subscriptions.push(
		fullCommitDisposable,
		simpleCommitDisposable,
		setApiKeyDisposable,
		openSettingsDisposable,
		generatePRDescriptionDisposable,
		createReleaseDisposable
	)
}

// Cleanup handler for extension deactivation
export function deactivate() { }
