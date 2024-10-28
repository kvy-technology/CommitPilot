import * as vscode from "vscode";

export function getGitExtension() {
  const vscodeGit = vscode.extensions.getExtension("vscode.git");
  const gitExtension = vscodeGit && vscodeGit.exports;
  return gitExtension && gitExtension.getAPI(1);
}

export function getSCMRepository() {
  const gitExtension = getGitExtension();
  if (!gitExtension) {
    return;
  }
  const repositories = gitExtension.repositories;
  if (repositories.length === 0) {
    return;
  }
  return repositories[0];
}

export function writeCommitMessageToSCM(message: string) {
  try {

    const repository = getSCMRepository();

    if (!repository) {
      return;
    }

    repository.inputBox.value = message;
  } catch (error) {
    console.error('CommitPilot: Error writing commit message to SCM', error);
  }
}