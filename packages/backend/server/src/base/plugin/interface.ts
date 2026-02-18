/**
 * Plugin Interface Contract
 *
 * All backend plugins should implement this interface to ensure consistent
 * lifecycle management, dependency declaration, and health reporting.
 *
 * This enables:
 * - Predictable plugin initialization and shutdown order
 * - Clear dependency graphs between plugins
 * - Health monitoring per plugin
 * - Future: dynamic plugin loading and third-party plugin support
 */

export interface PluginMetadata {
  /** Unique plugin identifier (e.g., 'copilot', 'payment', 'oauth') */
  name: string;
  /** Semantic version of the plugin */
  version: string;
  /** Human-readable description */
  description: string;
  /** Plugin author/team */
  author?: string;
  /** Other plugins this plugin depends on (by name) */
  dependencies?: string[];
}

export interface PluginHealthStatus {
  /** Plugin name */
  name: string;
  /** Whether the plugin is healthy */
  healthy: boolean;
  /** Optional details about health status */
  details?: Record<string, unknown>;
  /** Last time health was checked */
  checkedAt: Date;
}

export abstract class AFFiNEPlugin {
  abstract readonly metadata: PluginMetadata;

  /**
   * Called when the plugin module is initialized.
   * Use for setting up connections, registering providers, etc.
   */
  abstract onInit(): Promise<void>;

  /**
   * Called when the application is ready to serve traffic.
   * All plugins have been initialized at this point.
   */
  async onReady(): Promise<void> {
    // Default: no-op. Override if needed.
  }

  /**
   * Called during graceful shutdown.
   * Clean up resources, close connections, flush buffers.
   */
  async onShutdown(): Promise<void> {
    // Default: no-op. Override if needed.
  }

  /**
   * Report plugin health status.
   * Called periodically by the health monitoring system.
   */
  async healthCheck(): Promise<PluginHealthStatus> {
    return {
      name: this.metadata.name,
      healthy: true,
      checkedAt: new Date(),
    };
  }

  /**
   * Whether this plugin is enabled based on current configuration.
   */
  abstract isEnabled(): boolean;
}
