import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prompt Versioning & A/B Testing Service
 *
 * Supports:
 * - Immutable prompt versions (each edit creates a new version)
 * - A/B testing: route a percentage of traffic to a new prompt version
 * - Rollback: instantly revert to a previous version without code deploy
 * - Metrics tracking: associate prompt version with session outcomes
 */

export interface PromptVersion {
  id: number;
  promptName: string;
  version: number;
  model: string;
  config: Record<string, unknown> | null;
  messages: Array<{
    role: 'system' | 'assistant' | 'user';
    content: string;
    params?: Record<string, unknown>;
  }>;
  /** Percentage of traffic routed to this version (0-100) */
  trafficPercentage: number;
  isActive: boolean;
  createdAt: Date;
  createdBy?: string;
  description?: string;
}

export interface ABTestConfig {
  promptName: string;
  /** Control version (usually the current production version) */
  controlVersion: number;
  /** Treatment version (the new version being tested) */
  treatmentVersion: number;
  /** Percentage of traffic to route to treatment (0-100) */
  treatmentPercentage: number;
  /** Start time of the A/B test */
  startedAt: Date;
  /** Optional end time */
  endsAt?: Date;
}

@Injectable()
export class PromptVersioningService {
  private readonly logger = new Logger(PromptVersioningService.name);
  private readonly abTests = new Map<string, ABTestConfig>();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new version of a prompt.
   * The previous active version remains active — use activateVersion() to switch.
   */
  async createVersion(
    promptName: string,
    params: {
      model: string;
      messages: PromptVersion['messages'];
      config?: Record<string, unknown>;
      description?: string;
      createdBy?: string;
    }
  ): Promise<PromptVersion> {
    // Get the latest version number
    const latest = await this.prisma.aiPromptVersion.findFirst({
      where: { promptName },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    const created = await this.prisma.aiPromptVersion.create({
      data: {
        promptName,
        version: nextVersion,
        model: params.model,
        config: params.config ?? null,
        messages: params.messages as any,
        trafficPercentage: 0, // Inactive by default
        isActive: false,
        description: params.description ?? null,
        createdBy: params.createdBy ?? null,
      },
    });

    this.logger.log(
      `Created prompt version ${nextVersion} for "${promptName}"`
    );

    return this.toPromptVersion(created);
  }

  /**
   * Activate a specific prompt version, routing 100% of traffic to it.
   * Deactivates all other versions.
   */
  async activateVersion(
    promptName: string,
    version: number
  ): Promise<PromptVersion> {
    // Deactivate all versions
    await this.prisma.aiPromptVersion.updateMany({
      where: { promptName, isActive: true },
      data: { isActive: false, trafficPercentage: 0 },
    });

    // Activate the specified version
    const activated = await this.prisma.aiPromptVersion.update({
      where: {
        promptName_version: { promptName, version },
      },
      data: { isActive: true, trafficPercentage: 100 },
    });

    // Clear any active A/B test
    this.abTests.delete(promptName);

    this.logger.log(
      `Activated prompt version ${version} for "${promptName}"`
    );

    return this.toPromptVersion(activated);
  }

  /**
   * Start an A/B test between the current active version and a new version.
   */
  async startABTest(
    promptName: string,
    treatmentVersion: number,
    treatmentPercentage: number,
    durationMs?: number
  ): Promise<ABTestConfig> {
    const active = await this.prisma.aiPromptVersion.findFirst({
      where: { promptName, isActive: true },
    });

    if (!active) {
      throw new Error(`No active version found for prompt "${promptName}"`);
    }

    // Update traffic percentages
    const controlPercentage = 100 - treatmentPercentage;

    await this.prisma.aiPromptVersion.update({
      where: { promptName_version: { promptName, version: active.version } },
      data: { trafficPercentage: controlPercentage },
    });

    await this.prisma.aiPromptVersion.update({
      where: { promptName_version: { promptName, version: treatmentVersion } },
      data: { trafficPercentage: treatmentPercentage, isActive: true },
    });

    const config: ABTestConfig = {
      promptName,
      controlVersion: active.version,
      treatmentVersion,
      treatmentPercentage,
      startedAt: new Date(),
      endsAt: durationMs ? new Date(Date.now() + durationMs) : undefined,
    };

    this.abTests.set(promptName, config);

    this.logger.log(
      `Started A/B test for "${promptName}": ` +
        `v${active.version} (${controlPercentage}%) vs v${treatmentVersion} (${treatmentPercentage}%)`
    );

    return config;
  }

  /**
   * Resolve which prompt version to use for a given request.
   * Uses A/B test configuration if active, otherwise returns the active version.
   */
  async resolveVersion(promptName: string): Promise<number | null> {
    const abTest = this.abTests.get(promptName);

    if (abTest) {
      // Check if A/B test has expired
      if (abTest.endsAt && new Date() > abTest.endsAt) {
        this.abTests.delete(promptName);
        // Fall through to normal resolution
      } else {
        // Route based on traffic percentage
        const roll = Math.random() * 100;
        return roll < abTest.treatmentPercentage
          ? abTest.treatmentVersion
          : abTest.controlVersion;
      }
    }

    const active = await this.prisma.aiPromptVersion.findFirst({
      where: { promptName, isActive: true },
      orderBy: { version: 'desc' },
    });

    return active?.version ?? null;
  }

  /**
   * List all versions of a prompt.
   */
  async listVersions(promptName: string): Promise<PromptVersion[]> {
    const versions = await this.prisma.aiPromptVersion.findMany({
      where: { promptName },
      orderBy: { version: 'desc' },
    });

    return versions.map(v => this.toPromptVersion(v));
  }

  /**
   * Get the current A/B test configuration for a prompt.
   */
  getABTest(promptName: string): ABTestConfig | null {
    return this.abTests.get(promptName) ?? null;
  }

  private toPromptVersion(record: any): PromptVersion {
    return {
      id: record.id,
      promptName: record.promptName,
      version: record.version,
      model: record.model,
      config: record.config,
      messages: record.messages ?? [],
      trafficPercentage: record.trafficPercentage,
      isActive: record.isActive,
      createdAt: record.createdAt,
      createdBy: record.createdBy ?? undefined,
      description: record.description ?? undefined,
    };
  }
}
