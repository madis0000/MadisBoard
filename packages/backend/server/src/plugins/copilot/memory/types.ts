import { z } from 'zod';

export const MemoryEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  /** Category of the memory (preference, fact, instruction, context) */
  category: z.enum(['preference', 'fact', 'instruction', 'context']),
  /** The memory content in natural language */
  content: z.string().min(1).max(2000),
  /** Relevance score (0.0 to 1.0) — decays over time, boosted on retrieval */
  relevance: z.number().min(0).max(1).default(1.0),
  /** Optional source session that created this memory */
  sourceSessionId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  /** Last time this memory was retrieved and used in a session */
  lastAccessedAt: z.date().optional(),
  /** Number of times this memory has been accessed */
  accessCount: z.number().default(0),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const CreateMemorySchema = MemoryEntrySchema.pick({
  userId: true,
  workspaceId: true,
  category: true,
  content: true,
  sourceSessionId: true,
});

export type CreateMemory = z.infer<typeof CreateMemorySchema>;

export const MemoryQuerySchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  /** Optional category filter */
  category: z.enum(['preference', 'fact', 'instruction', 'context']).optional(),
  /** Maximum number of memories to return */
  limit: z.number().min(1).max(50).default(10),
  /** Optional semantic search query */
  query: z.string().optional(),
});

export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;
