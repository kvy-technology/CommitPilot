export type LLMProvider = 'groq' | 'openai' | 'googleGenAI'
export type ModelName = string

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
}

export interface ProviderConfig {
  modelName: ModelName
  apiKey: string
}

// Create-Release

export type VersionBump = 'major' | 'minor' | 'patch'
