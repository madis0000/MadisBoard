import { Injectable, Logger } from '@nestjs/common';

import { ServerFeature, ServerService } from '../../../core';
import { CircuitBreaker, CircuitBreakerState } from './circuit-breaker';
import type { CopilotProvider } from './provider';
import { CopilotProviderType, ModelFullConditions } from './types';

@Injectable()
export class CopilotProviderFactory {
  constructor(private readonly server: ServerService) {}

  private readonly logger = new Logger(CopilotProviderFactory.name);

  readonly #providers = new Map<CopilotProviderType, CopilotProvider>();
  readonly #circuitBreakers = new Map<CopilotProviderType, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a provider type.
   */
  getCircuitBreaker(type: CopilotProviderType): CircuitBreaker {
    let cb = this.#circuitBreakers.get(type);
    if (!cb) {
      cb = new CircuitBreaker(type, {
        failureThreshold: 5,
        resetTimeout: 30_000,
        windowSize: 60_000,
        halfOpenSuccessThreshold: 2,
      });
      this.#circuitBreakers.set(type, cb);
    }
    return cb;
  }

  /**
   * Record a successful provider call for circuit breaker tracking.
   */
  recordSuccess(type: CopilotProviderType): void {
    this.getCircuitBreaker(type).onSuccess();
  }

  /**
   * Record a failed provider call for circuit breaker tracking.
   */
  recordFailure(type: CopilotProviderType): void {
    this.getCircuitBreaker(type).onFailure();
  }

  private isProviderHealthy(type: CopilotProviderType): boolean {
    const cb = this.#circuitBreakers.get(type);
    if (!cb) return true;
    return cb.canExecute();
  }

  async getProvider(
    cond: ModelFullConditions,
    filter: {
      prefer?: CopilotProviderType;
    } = {}
  ): Promise<CopilotProvider | null> {
    this.logger.debug(
      `Resolving copilot provider for output type: ${cond.outputType}`
    );

    // First pass: find a healthy candidate
    let candidate: CopilotProvider | null = null;
    let fallback: CopilotProvider | null = null;

    for (const [type, provider] of this.#providers.entries()) {
      if (filter.prefer && filter.prefer !== type) {
        continue;
      }

      const isMatched = await provider.match(cond);
      if (!isMatched) continue;

      const healthy = this.isProviderHealthy(type);
      if (healthy) {
        candidate = provider;
        this.logger.debug(`Copilot provider candidate found: ${type}`);
        break;
      } else {
        // Track as fallback in case all providers are unhealthy
        if (!fallback) {
          fallback = provider;
          this.logger.warn(
            `Copilot provider [${type}] circuit is open, looking for alternatives`
          );
        }
      }
    }

    // If no healthy candidate found but preference was set, try without preference
    if (!candidate && filter.prefer) {
      for (const [type, provider] of this.#providers.entries()) {
        if (type === filter.prefer) continue;
        const isMatched = await provider.match(cond);
        if (isMatched && this.isProviderHealthy(type)) {
          candidate = provider;
          this.logger.warn(
            `Preferred provider unavailable, falling back to: ${type}`
          );
          break;
        }
      }
    }

    // Last resort: use unhealthy fallback (circuit breaker will probe)
    if (!candidate && fallback) {
      const cb = this.getCircuitBreaker(fallback.type);
      if (cb.currentState === CircuitBreakerState.HalfOpen || cb.canExecute()) {
        candidate = fallback;
        this.logger.warn(
          `All providers degraded, probing fallback: ${fallback.type}`
        );
      }
    }

    return candidate;
  }

  async getProviderByModel(
    modelId: string,
    filter: {
      prefer?: CopilotProviderType;
    } = {}
  ): Promise<CopilotProvider | null> {
    this.logger.debug(`Resolving copilot provider for model: ${modelId}`);

    let candidate: CopilotProvider | null = null;
    for (const [type, provider] of this.#providers.entries()) {
      if (filter.prefer && filter.prefer !== type) {
        continue;
      }

      if (await provider.match({ modelId })) {
        if (this.isProviderHealthy(type)) {
          candidate = provider;
          this.logger.debug(`Copilot provider candidate found: ${type}`);
        } else {
          // Keep looking for healthy alternative
          if (!candidate) {
            candidate = provider; // unhealthy fallback
          }
          this.logger.warn(
            `Copilot provider [${type}] circuit is open for model ${modelId}`
          );
        }
      }
    }

    return candidate;
  }

  register(provider: CopilotProvider) {
    this.#providers.set(provider.type, provider);
    this.logger.log(`Copilot provider [${provider.type}] registered.`);
    this.server.enableFeature(ServerFeature.Copilot);
  }

  unregister(provider: CopilotProvider) {
    this.#providers.delete(provider.type);
    this.#circuitBreakers.delete(provider.type);
    this.logger.log(`Copilot provider [${provider.type}] unregistered.`);
    if (this.#providers.size === 0) {
      this.server.disableFeature(ServerFeature.Copilot);
    }
  }
}
