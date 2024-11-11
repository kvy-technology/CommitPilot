import { z } from 'zod'

const commitTypeSchema = z
  .enum(['feat', 'fix', 'refactor', 'style', 'chore', 'revert'])
  .describe('The type of change: feat for features, fix for bug fixes, refactor for code improvements, style for visual changes, chore for maintenance, revert for reverting changes')

const commitDescriptionSchema = z
  .string()
  .describe('Clear and concise description of the change in lowercase, no period at end')

export const fullCommitSchema = z.object({
  type: commitTypeSchema,
  description: commitDescriptionSchema,
  body: z
    .array(z.string())
    .optional()
    .describe('List of specific changes, technical details, or breaking changes. Each item should start with a capitalized verb and be actionable')
})

export const simpleCommitSchema = z.object({
  type: commitTypeSchema,
  description: commitDescriptionSchema,
})

export const PRTitleSchema = z.object({
  title: z.string().describe('Provide a concise and descriptive title for the pull request'),
})

export const ChangelogEntrySchema = z.object({
  added: z.array(z.string()).optional().describe('List of added features'),
  changed: z.array(z.string()).optional().describe('List of changed features'),
  deprecated: z.array(z.string()).optional().describe('List of deprecated features'),
  removed: z.array(z.string()).optional().describe('List of removed features'),
  fixed: z.array(z.string()).optional().describe('List of fixed bugs'),
  security: z.array(z.string()).optional().describe('List of security vulnerabilities')
}).describe('Structured changelog entries grouped by change type');
