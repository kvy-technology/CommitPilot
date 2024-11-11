/**
 * LLM Service
 *
 * Provides a unified interface for interacting with different LLM providers
 * (OpenAI, Groq and Google Gemini) with support for structured output and learning mode.
 *
 * Features:
 * - Provider configuration management
 * - Learning mode with example-based prompting
 * - Structured output parsing
 * - Dynamic prompt enhancement
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { generateObject, generateText } from 'ai'
import * as vscode from 'vscode'
import { z } from 'zod'
import { DEFAULT_PROVIDER, PROVIDER_MODELS } from '../../constants/llm'
import { LLMProvider, ProviderConfig } from '../../types'
import { getRecentCommits } from '../git'

export class LLMService {
  private _temperature: number = 0.7

  /**
   * Retrieves LLM configuration from VS Code settings
   * @returns Provider configuration with API key and model name
   * @throws Error if API key is not configured
   *
   */
  private getConfig(): ProviderConfig {
    const config = vscode.workspace.getConfiguration('commitPilot')
    const provider = config.get<LLMProvider>('provider') || DEFAULT_PROVIDER
    const apiKey = config.get<string>('apiKey')

    if (!apiKey) {
      throw new Error(
        'API key not found. Please set your API key using the "Set API Key for CommitPilot" command'
      )
    }

    return {
      apiKey,
      modelName: PROVIDER_MODELS[provider],
    }
  }

  /**
   * Creates and returns an AI provider instance based on configuration
   * @returns Configured AI provider
   *
   */
  private getProvider() {
    const { apiKey, modelName } = this.getConfig()
    const provider =
      vscode.workspace.getConfiguration('commitPilot').get<LLMProvider>('provider') ||
      DEFAULT_PROVIDER

    switch (provider) {
      case 'groq':
        return createGroq({ apiKey })(modelName)
      case 'googleGenAI':
        return createGoogleGenerativeAI({ apiKey })(modelName)
      default:
        return createOpenAI({ apiKey })(modelName)
    }
  }

  /**
   * Initializes LLM service with configured provider
   * Supports OpenAI, Groq, and Google Generative AI providers
   */
  constructor() { }
  /**
   * Enhances prompts with recent commit examples when learning mode is enabled
   * @param basePrompt - Original prompt to enhance
   * @param disableExamples - Flag to bypass learning mode
   * @returns Enhanced prompt with examples if learning mode is enabled
   */
  private async getPromptWithExamples(
    basePrompt: string,
    disableExamples?: boolean
  ): Promise<string> {
    const config = vscode.workspace.getConfiguration('commitPilot')
    const learningModeEnabled = config.get<boolean>('useLearningMode')

    if (!learningModeEnabled || disableExamples) {
      return basePrompt
    }

    const [latestCommit] = await getRecentCommits(1)
    const examples = `Here is the latest commit from this repository:

${latestCommit.message}
---`

    return `${basePrompt}\n\n${examples}\n\nNow generate a commit message following the same style for this diff:\n`
  }

  /**
   * Generates responses using configured LLM
   * @param prompt - Template string for generation
   * @param schema - Optional Zod schema for structured output validation and parsing
   * @param input - Context data to be injected into the prompt template
   * @param disableExamples - Flag to bypass learning mode examples
   * @returns Generated response, either as structured data matching schema or raw text
   */
  async generate<T extends z.ZodType>({
    prompt,
    schema,
    input,
    disableExamples = true
  }: {
    prompt: string
    schema?: T
    input: Record<string, unknown>
    disableExamples?: boolean
  }): Promise<T extends z.ZodType ? z.infer<T> : string> {
    const enhancedPrompt = await this.getPromptWithExamples(prompt, disableExamples)
    const provider = this.getProvider()

    // Format the prompt with input variables
    const promptTemplate = PromptTemplate.fromTemplate(enhancedPrompt)
    const formattedPrompt = await promptTemplate.format(input)

    if (schema) {
      const { object } = await generateObject({
        model: provider,
        prompt: formattedPrompt,
        schema,
        temperature: this._temperature,
      })

      return object as z.infer<T>
    }

    const { text } = await generateText({
      model: provider,
      prompt: formattedPrompt,
      temperature: this._temperature,
    })

    return text as T extends z.ZodType ? z.infer<T> : string
  }
}
