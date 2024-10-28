import * as vscode from 'vscode'

export async function setApiKey() {
  const provider = vscode.workspace.getConfiguration('commitPilot').get('provider') as string
  const key = await vscode.window.showInputBox({
    prompt: `Enter your ${provider?.toUpperCase()} API key`,
    password: true,
    ignoreFocusOut: true,
  })

  if (key) {
    await vscode.workspace.getConfiguration('commitPilot').update('apiKey', key, true)
    vscode.window.showInformationMessage(`${provider?.toUpperCase()} API key has been saved`)
  }
}
