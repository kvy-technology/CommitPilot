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

import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatGroq } from '@langchain/groq'
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { z } from 'zod'
import * as vscode from 'vscode'
import { LLMProvider, ProviderConfig } from '../../types'
import { DEFAULT_PROVIDER, PROVIDER_MODELS } from '../../constants/llm'
import { getRecentCommits } from '../git'

export class LLMService {
  private model: BaseChatModel

  /**
   * Retrieves and validates LLM provider configuration from VS Code settings
   * Throws error if API key is not configured
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
   * Initializes LLM service with configured provider
   * Supports OpenAI, Groq, and Google Generative AI providers
   */
  constructor() {
    const { apiKey, modelName } = this.getConfig()
    const provider =
      vscode.workspace.getConfiguration('commitPilot').get<LLMProvider>('provider') ||
      DEFAULT_PROVIDER

    switch (provider) {
      case 'groq':
        this.model = new ChatGroq({ apiKey, modelName, temperature: 0.5 })
        break
      case 'googleGenAI':
        this.model = new ChatGoogleGenerativeAI({
          apiKey,
          modelName,
          temperature: 0.5,
        })
        break
      default:
        this.model = new ChatOpenAI({ apiKey, modelName, temperature: 0.5 })
    }
  }
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
   * @param schema - Optional Zod schema for structured output
   * @param input - Context data for prompt
   * @param disableExamples - Flag to disable learning mode
   * @returns Generated response, parsed according to schema if provided
   */
  async generate<T extends z.ZodType>({
    prompt,
    schema,
    input,
    disableExamples,
  }: {
    prompt: string
    schema?: T
    input: Record<string, unknown>
    disableExamples?: boolean
  }): Promise<T extends z.ZodType ? z.infer<T> : string> {
    const enhancedPrompt = await this.getPromptWithExamples(prompt, disableExamples)
    const promptTemplate = PromptTemplate.fromTemplate(enhancedPrompt)

    if (schema) {
      const chain = RunnableSequence.from([promptTemplate, this.model.withStructuredOutput(schema)])
      return chain.invoke(input)
    }

    const chain = RunnableSequence.from([promptTemplate, this.model])

    return chain.invoke(input).then((response) => response.content) as Promise<
      T extends z.ZodType ? z.infer<T> : string
    >
  }
}
