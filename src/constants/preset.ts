export const KVY_PRESET = {
  NAME: 'KVY',
  PROMPT: `Write a meaningful commit message for the project by summing up, thus being specific, to what changed. If you can figure out the benefits of the code, you may add add this to the commit body. I'll send you an output of 'git diff --cached' command, and you convert it into a commit messager. 
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
\`\`\``
}