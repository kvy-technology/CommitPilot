/**
 * Settings Configuration Command
 * 
 * Provides quick access to CommitPilot extension settings in VS Code.
 * Opens settings panel filtered to show only CommitPilot-specific options.
 */

import * as vscode from 'vscode'

/**
 * Command handler for opening extension settings
 * - Opens VS Code settings UI
 * - Automatically filters to show CommitPilot settings
 * - Uses extension ID to ensure correct filtering
 */
export function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', '@ext:KVYTech.commit-pilot')
}
