export const KVY_PRESET = {
  NAME: 'KVY',
  GENERATE_COMMIT_PROMPT: `Write a meaningful commit message for the project by summing up, thus being specific, to what changed. If you can figure out the benefits of the code, you may add add this to the commit body. I'll send you an output of 'git diff --cached' command, and you convert it into a commit messager. 
Do not use any emojis! Do not express your opinions or anything else, respond the correct format of message.

The commit description (which comes right after the "type(scope):" must not be sentence-case, start-case, pascal-case, upper-case [subject-case] and not end with a period (.).

## Possible types:

- feat: Introduces a new feature or removes an existing feature.
- fix: Fixes a bug, making the application function as intended.
- refactor: Improves code without changing external behavior, including code formatting and removing redundancy.
- style: Changes that affect the style of the application, such as CSS changes that alter the frontend look without impacting functionality.
- chore: Routine tasks that don't modify the application code or test files, such as updating dependencies.
- revert: Reverses a previous commit, useful for quickly addressing issues introduced by recent changes.

Git Diff:

\`\`\`
{diff}
\`\`\``,
  GENERATE_PR_DESCRIPTION_PROMPT: `Generate a pull request description based on the git diff output and the message provided. The pull request description has three sections: What happened, Insight, and Proof Of Work.

- What happened section provides a brief review and concise description of the changes introduced by the pull request. Below is the format of this section (delimited by triple backticks):

\`\`\`
## What happened

- Issue: [Issue number, e.g., #1]

This PR aims to [concisely describe the changes introduced by the PR]. The main changes include:

- [Change 1]
- [Change 2]
- ...
\`\`\`

- Insight section explains thoroughly the difference (changes from previous branch compare to the current one) from git diff. When appropriate, consider using Mermaid script to create flowcharts or diagrams that visually represent the changes or the logic flow. Below is the format of this section (delimited by triple backticks):

\`\`\`
## Insight
Explain the changes thoroughly
\`\`\`

- Proof Of Work section is left blank. Simply add the following text: "## Proof Of Work 📹"

Your goal is to encourage self-reliance and comprehension through interactive support. To achieve this, generate a pull request description that is clear, concise, and thorough in explaining the changes and the reasoning behind them.

The description should provide reviewers with a comprehensive understanding of the pull request's purpose and impact. Use simple and straightforward words, avoiding buzzwords and overly complex vocabulary. Keep it concise.

Git Changes:
\`\`\`
{diff}
\`\`\``,
  GENERATE_PR_TITLE_PROMPT: `Generate pull request names based on the provided description. The format for the pull request name should be:

"[Issue number] - [Name]"

- If the issue number is provided in the description, include it in the format.
- If no issue number is provided or if it is marked as N/A, only include the name part.

To extract the necessary information:
1. Look for any mention of "Issue" or similar terms to find the issue number.
2. Summarize the main purpose or changes introduced by this pull request succinctly into a descriptive name.

Description:
\`\`\`
{description}
\`\`\``
}