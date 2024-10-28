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
