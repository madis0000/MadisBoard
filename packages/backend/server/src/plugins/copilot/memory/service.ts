import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { SessionCache } from '../../../base';
import type { CreateMemory, MemoryEntry, MemoryQuery } from './types';

const MEMORY_CACHE_TTL = 300; // 5 minutes
const MAX_MEMORIES_PER_USER_WORKSPACE = 200;
const RELEVANCE_DECAY_FACTOR = 0.95;
const RELEVANCE_BOOST_ON_ACCESS = 0.1;

/**
 * AI Agent Memory Service
 *
 * Provides persistent memory for AI copilot sessions, allowing the AI to:
 * - Remember user preferences across sessions
 * - Store facts about the user's workspace and projects
 * - Recall instructions given in previous conversations
 *
 * Memories are stored per user per workspace and decay over time
 * if not accessed, ensuring relevance.
 */
@Injectable()
export class CopilotMemoryService {
  private readonly logger = new Logger(CopilotMemoryService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache: SessionCache
  ) {}

  /**
   * Store a new memory entry for a user in a workspace.
   */
  async create(input: CreateMemory): Promise<MemoryEntry> {
    const now = new Date();
    const entry: MemoryEntry = {
      id: randomUUID(),
      userId: input.userId,
      workspaceId: input.workspaceId,
      category: input.category,
      content: input.content,
      relevance: 1.0,
      sourceSessionId: input.sourceSessionId,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
    };

    // Check if a similar memory already exists to avoid duplicates
    const existing = await this.findSimilar(
      input.userId,
      input.workspaceId,
      input.content
    );
    if (existing) {
      // Boost existing memory instead of creating duplicate
      return this.boostRelevance(existing.id);
    }

    // Enforce per-user-workspace limit by evicting lowest relevance memories
    await this.enforceLimit(input.userId, input.workspaceId);

    await this.prisma.aiMemory.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        workspaceId: entry.workspaceId,
        category: entry.category,
        content: entry.content,
        relevance: entry.relevance,
        sourceSessionId: entry.sourceSessionId ?? null,
      },
    });

    this.invalidateCache(input.userId, input.workspaceId);
    this.logger.debug(
      `Created memory [${entry.category}] for user ${input.userId}`
    );

    return entry;
  }

  /**
   * Retrieve relevant memories for a user in a workspace.
   */
  async query(params: MemoryQuery): Promise<MemoryEntry[]> {
    const cacheKey = this.cacheKey(
      params.userId,
      params.workspaceId,
      params.category
    );

    // Check cache first
    const cached = await this.cache.get<MemoryEntry[]>(cacheKey);
    if (cached) {
      return cached.slice(0, params.limit);
    }

    const where: Record<string, unknown> = {
      userId: params.userId,
      workspaceId: params.workspaceId,
    };

    if (params.category) {
      where.category = params.category;
    }

    const memories = await this.prisma.aiMemory.findMany({
      where,
      orderBy: [{ relevance: 'desc' }, { updatedAt: 'desc' }],
      take: params.limit,
    });

    const entries: MemoryEntry[] = memories.map(m => ({
      id: m.id,
      userId: m.userId,
      workspaceId: m.workspaceId,
      category: m.category as MemoryEntry['category'],
      content: m.content,
      relevance: m.relevance,
      sourceSessionId: m.sourceSessionId ?? undefined,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      lastAccessedAt: m.lastAccessedAt ?? undefined,
      accessCount: m.accessCount,
    }));

    // Cache results
    await this.cache.set(cacheKey, entries, {
      ttl: MEMORY_CACHE_TTL * 1000,
    });

    // Record access asynchronously (don't block the query)
    for (const entry of entries) {
      this.recordAccess(entry.id).catch(e =>
        this.logger.error('Failed to record memory access', e)
      );
    }

    return entries;
  }

  /**
   * Format memories as a system prompt section for injection into AI context.
   */
  async getMemoryPromptSection(
    userId: string,
    workspaceId: string
  ): Promise<string | null> {
    const memories = await this.query({
      userId,
      workspaceId,
      limit: 15,
    });

    if (memories.length === 0) return null;

    const sections: Record<string, string[]> = {};
    for (const memory of memories) {
      if (!sections[memory.category]) {
        sections[memory.category] = [];
      }
      sections[memory.category].push(`- ${memory.content}`);
    }

    const parts: string[] = [
      'The following are remembered facts about this user and workspace:',
    ];
    if (sections.preference?.length) {
      parts.push(`\nUser Preferences:\n${sections.preference.join('\n')}`);
    }
    if (sections.fact?.length) {
      parts.push(`\nKnown Facts:\n${sections.fact.join('\n')}`);
    }
    if (sections.instruction?.length) {
      parts.push(
        `\nUser Instructions:\n${sections.instruction.join('\n')}`
      );
    }
    if (sections.context?.length) {
      parts.push(`\nContext:\n${sections.context.join('\n')}`);
    }

    return parts.join('\n');
  }

  /**
   * Delete a specific memory entry.
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.aiMemory.deleteMany({
      where: { id, userId },
    });

    return result.count > 0;
  }

  /**
   * Decay relevance scores for old, unused memories.
   * Should be called periodically (e.g., daily cron job).
   */
  async decayRelevance(): Promise<number> {
    const result = await this.prisma.$executeRaw`
      UPDATE ai_memories
      SET relevance = relevance * ${RELEVANCE_DECAY_FACTOR},
          updated_at = NOW()
      WHERE last_accessed_at < NOW() - INTERVAL '7 days'
        AND relevance > 0.1
    `;

    this.logger.log(`Decayed relevance for ${result} memory entries`);

    // Clean up memories with very low relevance
    const cleaned = await this.prisma.aiMemory.deleteMany({
      where: { relevance: { lt: 0.05 } },
    });

    if (cleaned.count > 0) {
      this.logger.log(`Cleaned up ${cleaned.count} low-relevance memories`);
    }

    return result;
  }

  private async boostRelevance(id: string): Promise<MemoryEntry> {
    const updated = await this.prisma.aiMemory.update({
      where: { id },
      data: {
        relevance: { increment: RELEVANCE_BOOST_ON_ACCESS },
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      workspaceId: updated.workspaceId,
      category: updated.category as MemoryEntry['category'],
      content: updated.content,
      relevance: Math.min(updated.relevance, 1.0),
      sourceSessionId: updated.sourceSessionId ?? undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      lastAccessedAt: updated.lastAccessedAt ?? undefined,
      accessCount: updated.accessCount,
    };
  }

  private async recordAccess(id: string): Promise<void> {
    await this.prisma.aiMemory.update({
      where: { id },
      data: {
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 },
      },
    });
  }

  private async findSimilar(
    userId: string,
    workspaceId: string,
    content: string
  ): Promise<MemoryEntry | null> {
    // Simple text similarity — check for exact or near-exact matches
    // For production, this should use embedding similarity
    const normalized = content.toLowerCase().trim();
    const existing = await this.prisma.aiMemory.findFirst({
      where: {
        userId,
        workspaceId,
        content: { equals: normalized, mode: 'insensitive' },
      },
    });

    if (!existing) return null;

    return {
      id: existing.id,
      userId: existing.userId,
      workspaceId: existing.workspaceId,
      category: existing.category as MemoryEntry['category'],
      content: existing.content,
      relevance: existing.relevance,
      sourceSessionId: existing.sourceSessionId ?? undefined,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      lastAccessedAt: existing.lastAccessedAt ?? undefined,
      accessCount: existing.accessCount,
    };
  }

  private async enforceLimit(
    userId: string,
    workspaceId: string
  ): Promise<void> {
    const count = await this.prisma.aiMemory.count({
      where: { userId, workspaceId },
    });

    if (count >= MAX_MEMORIES_PER_USER_WORKSPACE) {
      // Delete lowest-relevance entries
      const toDelete = count - MAX_MEMORIES_PER_USER_WORKSPACE + 1;
      const lowest = await this.prisma.aiMemory.findMany({
        where: { userId, workspaceId },
        orderBy: { relevance: 'asc' },
        take: toDelete,
        select: { id: true },
      });

      await this.prisma.aiMemory.deleteMany({
        where: { id: { in: lowest.map(m => m.id) } },
      });
    }
  }

  private cacheKey(
    userId: string,
    workspaceId: string,
    category?: string
  ): string {
    return `copilot:memory:${userId}:${workspaceId}:${category ?? 'all'}`;
  }

  private invalidateCache(userId: string, workspaceId: string): void {
    this.cache
      .delete(this.cacheKey(userId, workspaceId))
      .catch(() => {
        /* ignore cache errors */
      });
  }
}
