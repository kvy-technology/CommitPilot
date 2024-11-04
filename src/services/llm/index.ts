import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatGroq } from '@langchain/groq'
import { ChatOpenAI } from '@langchain/openai'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { z } from 'zod'
import * as vscode from 'vscode'
import { LLMProvider, ProviderConfig } from '../../types'
import { DEFAULT_PROVIDER, PROVIDER_MODELS } from '../../constants/llm'
import { getRecentCommits } from '../git'

export class LLMService {
  private model: BaseChatModel

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

  constructor() {
    const { apiKey, modelName } = this.getConfig()
    const provider =
      vscode.workspace.getConfiguration('commitPilot').get<LLMProvider>('provider') ||
      DEFAULT_PROVIDER

    this.model =
      provider === 'groq'
        ? new ChatGroq({ apiKey, modelName })
        : new ChatOpenAI({ apiKey, modelName })
  }

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

    return chain.invoke(input).then((response) => response.content) as Promise<T extends z.ZodType ? z.infer<T> : string>
  }
}
