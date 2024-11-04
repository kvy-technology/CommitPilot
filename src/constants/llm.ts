import { LLMProvider, ModelName } from '../types'

export const DEFAULT_PROVIDER: LLMProvider = 'groq'

export const PROVIDER_MODELS: Record<LLMProvider, ModelName> = {
  groq: 'llama-3.1-70b-versatile',
  openai: 'gpt-4o-mini'
} as const

export const PROVIDER_NAMES = {
  groq: 'Groq',
  openai: 'OpenAI'
} as const

export const DEFAULT_PROMPTS = {
  REFINE_PR_DESCRIPTION_PROMPT: `Refine the following PR description while preserving its exact section structure. Keep all headers and formatting intact.

Requirements:
- Maintain the exact same section headers and structure
- Update only the content within each section
- Use passive voice and neutral tone
- Keep technical accuracy and objectivity
- Preserve any existing Mermaid diagrams or formatting

Requested improvements: {refinementInput}

Current description:
"""
{description}
"""`,
  GET_PR_TEMPLATE_PROMPT: `Generate a pull request description based on the git diff output and the message provided.

Template to follow:
{template}

Your goal is to encourage self-reliance and comprehension through interactive support. Generate a pull request description that is clear, concise, and thorough in explaining the changes and their reasoning.

The description should provide reviewers with a comprehensive understanding of the pull request's purpose and impact. Use simple and straightforward words, avoiding buzzwords and overly complex vocabulary. Keep it concise.

Requirements:
- Use passive voice consistently
- Avoid first-person pronouns (I, we, my, our)
- Focus on what changed, not who changed it
- Maintain technical accuracy and objectivity
- Use factual, neutral language throughout

Git Changes:
\`\`\`
{diff}
\`\`\``
}