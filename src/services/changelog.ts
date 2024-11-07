/**
 * Changelog Management Service
 *
 * Provides functionality for:
 * - Automated changelog generation using AI
 * - Semantic version bumping
 * - Keep a Changelog format compliance
 * - Interactive version selection through VS Code UI
 */
import * as vscode from 'vscode'
import * as fs from 'fs/promises'
import * as path from 'path'
import { getWorkspaceFolder } from '../utils/workspace'
import { LLMService } from '../services/llm'
import { getRecentCommits } from '../services/git'
import { KVY_PRESET } from '../constants/preset'
import { VersionBump } from '../types'
import { ChangelogEntrySchema } from '../constants/schema'
import { z } from 'zod'

// Template for new changelog files following Keep a Changelog format
const DEFAULT_CHANGELOG = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

`

/**
 * Updates or creates CHANGELOG.md with new release information
 *
 * @param newVersion - The version string to add to changelog (e.g. 'v1.0.0')
 * @throws {Error} When file operations fail
 * @returns {Promise<void>}
 */
export async function updateChangelog(newVersion: string): Promise<void> {
  const workspaceFolder = getWorkspaceFolder()
  const changelogPath = path.join(workspaceFolder, 'CHANGELOG.md')

  // Initialize or load existing changelog
  let existingContent
  try {
    existingContent = await fs.readFile(changelogPath, 'utf8')
  } catch (error) {
    existingContent = DEFAULT_CHANGELOG
  }

  // Generate AI-powered changelog content from recent commit history
  const llm = new LLMService()
  const commits = await getRecentCommits(50)
  const commitMessages = commits.map((commit) => commit.message).join('\n')

  const changelogContent = await llm.generate({
    prompt: KVY_PRESET.GENERATE_CHANGELOG_PROMPT,
    input: {
      commits: commitMessages,
    },
    disableExamples: true,
  })

  // Format new version entry with ISO date
  const date = new Date().toISOString().split('T')[0]
  const newEntry = `\n## [${newVersion}] - ${date}\n\n${changelogContent}\n`

  // Insert new version while preserving Unreleased section
  const updatedContent = existingContent.replace(
    /## \[Unreleased\]/,
    `## [Unreleased]\n${newEntry}`
  )

  await fs.writeFile(changelogPath, updatedContent, 'utf8')
}

/**
 * Determines the next version number through user interaction
 *
 * @returns {Promise<string>} The next version string prefixed with 'v'
 * @throws {Error} When version selection is cancelled
 * @throws {Error} When package.json parsing fails
 */
export async function determineNextVersion(): Promise<string> {
  let currentVersion = '0.0.0'

  try {
    const workspaceFolder = getWorkspaceFolder()
    const packageJsonPath = path.join(workspaceFolder, 'package.json')
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
    currentVersion = packageJson.version || currentVersion
  } catch {
    console.log('CommitPilot: No package.json found. Using default version.')
  }

  // Present version bump options with visual indicators
  const items = [
    {
      label: '$(arrow-up) Major',
      description: `${currentVersion} → ${bumpVersion(currentVersion, 'major')}`,
      value: 'major',
    },
    {
      label: '$(arrow-right) Minor',
      description: `${currentVersion} → ${bumpVersion(currentVersion, 'minor')}`,
      value: 'minor',
    },
    {
      label: '$(arrow-small-down) Patch',
      description: `${currentVersion} → ${bumpVersion(currentVersion, 'patch')}`,
      value: 'patch',
    },
  ]

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select version bump',
    title: 'CommitPilot: Choose Release Type',
  })

  if (!selected) {
    throw new Error('Version selection cancelled')
  }

  return `v${bumpVersion(currentVersion, selected.value as VersionBump)}`
}

/**
 * Calculates the next version number based on semantic versioning rules
 *
 * @param version - Current version string (with or without 'v' prefix)
 * @param type - Type of version bump ('major', 'minor', or 'patch')
 * @returns {string} The bumped version number without 'v' prefix
 */
function bumpVersion(version: string, type: VersionBump): string {
  const [major, minor, patch] = version.replace('v', '').split('.').map(Number)

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
  }
}

/**
 * Updates the "Unreleased" section of the project's CHANGELOG.md file with the provided commit diffs.
 *
 * This function generates a changelog entry based on the provided commit messages, formats it in Markdown, and appends it to the "Unreleased" section of the CHANGELOG.md file.
 *
 * @param diff - An array of commit diffs containing the commit messages to be included in the changelog.
 * @returns A Promise that resolves when the CHANGELOG.md file has been updated.
 */
export async function updateUnreleasedChangelog(newChangelog: string): Promise<void> {
  const workspaceFolder = getWorkspaceFolder();
  const changelogPath = path.join(workspaceFolder, 'CHANGELOG.md');

  // Read or create CHANGELOG.md
  let existingContent = DEFAULT_CHANGELOG;
  try {
    existingContent = await fs.readFile(changelogPath, 'utf8');
  } catch { }

  // Extract existing unreleased content
  const unreleasedMatch = existingContent.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n## \[|$)/);
  const existingUnreleased = unreleasedMatch ? unreleasedMatch[1].trim() : '';

  // Merge existing and new changes
  let mergedChanges = '';
  if (existingUnreleased) {
    mergedChanges = `${existingUnreleased}\n\n${newChangelog}`;
  } else {
    mergedChanges = newChangelog;
  }

  // Update CHANGELOG.md with merged changes
  const updatedContent = existingContent.replace(
    /## \[Unreleased\][\s\S]*?(?=\n## \[|$)/,
    `## [Unreleased]\n\n${mergedChanges}`
  );

  await fs.writeFile(changelogPath, updatedContent, 'utf8');
}


/**
 * Formats a set of changelog entries into a Markdown-formatted string.
 *
 * @param entries - The changelog entries to format.
 * @returns A Markdown-formatted string representing the changelog entries.
 */
export function formatChangelogEntries(entries: z.infer<typeof ChangelogEntrySchema>): string {
  const sections = [
    { title: 'Added', items: entries.added },
    { title: 'Changed', items: entries.changed },
    { title: 'Deprecated', items: entries.deprecated },
    { title: 'Removed', items: entries.removed },
    { title: 'Fixed', items: entries.fixed },
    { title: 'Security', items: entries.security }
  ];

  return sections
    .filter(section => section.items?.length)
    .map(section => `### ${section.title}\n${section.items!.map(item => `- ${item}`).join('\n')}`)
    .join('\n\n');
}
