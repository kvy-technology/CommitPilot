# Change Log

All notable changes to the "CommitPilot" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

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
