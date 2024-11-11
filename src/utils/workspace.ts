import * as vscode from 'vscode'

/**
 * Retrieves the current workspace folder path
 * @throws Error if no workspace is open
 */
export const getWorkspaceFolder = (): string => {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders) {
    throw new Error('No workspace folder found')
  }
  return workspaceFolders[0].uri.fsPath
}
