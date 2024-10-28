import 'dotenv/config';
import * as vscode from 'vscode';
import { generateFullCommitMessage, generateSimpleCommitMessage } from './commands/generate-commit-message';
import { COMMANDS } from './constants/commands';
import { setApiKey } from './commands/set-api-key';

export function activate(context: vscode.ExtensionContext) {
	const fullCommitDisposable = vscode.commands.registerCommand(
		COMMANDS.GENERATE_FULL_COMMIT_MESSAGE,
		generateFullCommitMessage
	)

	const simpleCommitDisposable = vscode.commands.registerCommand(
		COMMANDS.GENERATE_SIMPLE_COMMIT_MESSAGE,
		generateSimpleCommitMessage
	)

	const setApiKeyDisposable = vscode.commands.registerCommand(
		COMMANDS.SET_API_KEY,
		setApiKey
	)

	context.subscriptions.push(fullCommitDisposable, simpleCommitDisposable, setApiKeyDisposable)
}

export function deactivate() { }
