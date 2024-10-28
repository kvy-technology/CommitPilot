export type LLMProvider = 'groq' | 'openai'
export type ModelName = string

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
}

export interface ProviderConfig {
  modelName: ModelName
  apiKey: string
}
