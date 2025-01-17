# Change Log

All notable changes to the "CommitPilot" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Updated

- Updated the LLM providers:

  - Groq: llama-3.1-70b-versatile -> llama-3.3-70b-versatile
  - Google GenAI: gemini-1.5-flash-002 -> gemini-2.0-flash-exp

- Updated the temperature for the LLM providers: 0.7 -> 0.4
- Updated the prompt template for the LLM providers (using XML format)

## [0.2.0] - 2024-11-13

### Added

- Automated GitHub release creation using a Personal Access Token (PAT).
- Improved command to generate pull request descriptions (`generate-pull-request-description`).
- Added command to create releases (`createRelease`).
- Semantic version bumping functionality, including custom version input.
- Git tag creation for releases. Tag messages are now escaped to handle special characters.
- Release validation before creation, ensuring a clean repository state.
- Changelog management service with AI-powered generation and interactive version selection.

### Changed

- Improved changelog generation process.
- Refined pull request description generation process.
- Improved error handling and user feedback throughout the release process
- Refactored code for improved organization and reusability.

### Fixed

- Fixed the issue when checking for deleted files in the staged changes will break the diff output.

## [0.1.2] - 2024-11-06

### Fixed

- Fixed the issue with generating commit messages via Google Generative AI, which was previously unusable due to the Langchain package.

### Changed

- Use AI SDK (@ai-sdk/openai, @ai-sdk/google, @ai-sdk/groq) instead of Langchain package

## [0.1.1] - 2024-11-05

### Fixed

- Fixed issue where the pull request feedback loop select box will be disappeared if switch to another tab

## [0.1.0] - 2024-11-04

### Added

- Added PR description generation

  - Generate PR description based on the git diff output
  - Create PRs with context-aware descriptions
  - Allow users to refine the description until they are satisfied and ready to submit
  - Allow users to specify a custom PR template

- Support for Google GenAI provider (Google Gemini Flash)
- Added Open Settings command to open extension settings faster

### Changed

- Added comments to all functions and classes in the codebase

### Fixed

- Skipped the lock file (e.g. package-lock.json) when retrieving the diff output

## [0.0.2] - 2024-10-29

### Changed

- Updated README.md for better documentation

## [0.0.1] - 2024-10-28

### Added

- Commit message generation with AI

  - Full commit message generation
  - Simple commit message generation

- Configuration options for provider, API key, and learning mode (experimental)

  - Provider: OpenAI or Groq
  - Models: GPT-4o-mini or Llama-3.1-70b-versatile

### Changed

- Updated extension name to "CommitPilot"

## [0.0.0] - 2024-10-28

- Initial release
