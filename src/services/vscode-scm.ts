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

export async function openPRCreationPage(description: string, baseBranch: string, title: string) {
  const repository = getSCMRepository();
  if (!repository) return;

  const remote = repository.state.remotes[0]?.fetchUrl;
  if (!remote) return;

  const currentBranch = repository.state.HEAD?.name;
  const encodedTitle = encodeURIComponent(title);
  const defaultBody = "Paste the content from your clipboard here";

  // Copy description to clipboard
  await vscode.env.clipboard.writeText(description);

  let prUrl: string;

  if (remote.includes('github.com')) {
    const webUrl = remote
      .replace('git@github.com:', 'https://github.com/')
      .replace('.git', '');
    prUrl = `${webUrl}/compare/${baseBranch}...${currentBranch}?expand=1&title=${encodedTitle}&body=${encodeURIComponent(defaultBody)}`;
  } else if (remote.includes('gitlab.com')) {
    const webUrl = remote
      .replace('git@gitlab.com:', 'https://gitlab.com/')
      .replace('.git', '');
    prUrl = `${webUrl}/-/merge_requests/new?merge_request[source_branch]=${currentBranch}&merge_request[target_branch]=${baseBranch}&merge_request[title]=${encodedTitle}&merge_request[description]=${encodeURIComponent(defaultBody)}`;
  } else if (remote.includes('bitbucket.org')) {
    const webUrl = remote
      .replace('git@bitbucket.org:', 'https://bitbucket.org/')
      .replace('.git', '');
    prUrl = `${webUrl}/pull-requests/new?source=${currentBranch}&dest=${baseBranch}&title=${encodedTitle}&description=${encodeURIComponent(defaultBody)}`;
  } else {
    const document = await vscode.workspace.openTextDocument({
      content: description,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(document);
    return;
  }

  vscode.window.showInformationMessage('PR description copied to clipboard! Opening PR creation page...');
  await vscode.env.openExternal(vscode.Uri.parse(prUrl));
}