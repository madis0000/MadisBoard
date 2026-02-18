import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { SkipThrottle } from '../../base';
import { Public } from '../auth';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  version: string;
  checks: Record<
    string,
    {
      status: 'up' | 'down';
      latency?: number;
      message?: string;
    }
  >;
}

@Controller('/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Liveness probe — is the process alive and responsive?
   * Used by Kubernetes/Docker to determine if the container should be restarted.
   * This should be lightweight and NOT check external dependencies.
   */
  @SkipThrottle()
  @Public()
  @Get('/live')
  @HttpCode(HttpStatus.OK)
  live() {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe — can the server handle traffic?
   * Used by Kubernetes/load balancers to determine if traffic should be routed.
   * Checks critical dependencies (database, etc.).
   */
  @SkipThrottle()
  @Public()
  @Get('/ready')
  async ready() {
    const result: HealthCheckResult = {
      status: 'healthy',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: env.version,
      checks: {},
    };

    // Check database connectivity
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      result.checks.database = {
        status: 'up',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      result.checks.database = {
        status: 'down',
        latency: Date.now() - dbStart,
        message:
          error instanceof Error ? error.message : 'Database check failed',
      };
      result.status = 'unhealthy';
    }

    // If any check is down, mark as unhealthy
    const hasDownChecks = Object.values(result.checks).some(
      c => c.status === 'down'
    );
    if (hasDownChecks) {
      result.status = 'unhealthy';
      this.logger.warn('Readiness check failed', JSON.stringify(result));
    }

    return result;
  }
}
