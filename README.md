# CommitPilot

Transform your Git workflow with AI-powered commit messages and PR automation.

## Core Features

### Generate commit messages

Transform your staged changes into structured commit messages with:

- Two generation modes:
  - Full format: Includes commit type, description, and detailed bullet-point body
  - Simple format: Concise type and description for straightforward changes
- Follows conventional commit standards
- Automatic analysis of staged files
- Support for multiple AI providers (OpenAI, Groq)
- Learning mode to improve messages based on repository history

Generate full / simple commit messages based on your code changes

![CleanShot 2024-10-29 at 15 23 49](https://github.com/user-attachments/assets/ee05eba1-6bef-494b-9d84-21115323507c)

Sample:

![CleanShot 2024-10-29 at 15 15 53](https://github.com/user-attachments/assets/0b3f84b2-df24-42c2-8d6e-902f6182721f)

### Create PRs with context-aware descriptions

Generate comprehensive PR descriptions automatically with:

- Smart analysis of git diff changes
- Interactive refinement workflow until description is perfect
- Support for custom PR templates:
  - Default GitHub PR template
  - Custom template file path configuration
  - Flexible template customization options

![CleanShot 2024-11-04 at 14 41 40](https://github.com/user-attachments/assets/5745d0fa-be21-4872-ba88-591546a1464b)

### Create Releases

```
Generate Commit
    |
    v
[Staged Changes] --> [AI Analysis] --> [Commit Message] --> [Git Commit]
    |
    v
Generate Pull Request
    |
    v
[Branch Diff] --> [AI Analysis] --> [PR Description Draft] --> [User Review/Refine] --> [Update Changelog] --> [Create PR]
    |
    v
Create Release
    |
    v
[Sync Remote] --> [Version Bump] --> [Update Changelog] --> [Create Git Tag] --> [Push Changes] --> [GitHub Release]

```

## Configuration

CommitPilot offers several configuration options to customize your experience:

### Commit Message Generation

- `commitPilot.activePreset`: Select commit message style preset (Default: KVY conventional commit style)
- `commitPilot.showFullCommitButton`: Toggle visibility of full commit message button in SCM view
- `commitPilot.showSimpleCommitButton`: Toggle visibility of simple commit message button in SCM view
- `commitPilot.useLearningMode`: Enable experimental learning mode to improve commit messages based on repository history

### AI Provider Settings

- `commitPilot.provider`: Choose your AI provider (OpenAI or Groq)
- `commitPilot.apiKey`: Set your API key for the selected provider

### PR Description Settings

- `commitPilot.customPRTemplate`: Specify path to your custom PR template markdown file (relative to workspace root)

You can modify these settings through VS Code's settings UI or directly in your settings.json file.

![CleanShot 2024-11-04 at 14 45 06](https://github.com/user-attachments/assets/5022cb00-e513-4568-bbe1-54f4158bbb1d)

## Roadmap

- ~~Create PRs with context-aware descriptions~~ 🚀 (Done in v0.1.0)
- Automated changelog generation
- Release management
- Your suggestions welcome!

## 🤝 Contributing

Fork the repo
Create your feature branch
Submit a PR
See CONTRIBUTING.md for detailed guidelines.

## 🔗 Links

Built with ❤️ by [KVYTech](https://kvytechnology.com/)
