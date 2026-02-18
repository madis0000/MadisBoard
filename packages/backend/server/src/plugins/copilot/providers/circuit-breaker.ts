import { Logger } from '@nestjs/common';

export enum CircuitBreakerState {
  Closed = 'CLOSED',
  Open = 'OPEN',
  HalfOpen = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before transitioning from Open to HalfOpen */
  resetTimeout: number;
  /** Sliding window size in ms for counting failures */
  windowSize: number;
  /** Number of successful probes required in HalfOpen to close */
  halfOpenSuccessThreshold: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30_000, // 30 seconds
  windowSize: 60_000, // 1 minute
  halfOpenSuccessThreshold: 2,
};

export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitBreakerState = CircuitBreakerState.Closed;
  private failures: number[] = [];
  private lastFailureTime = 0;
  private halfOpenSuccesses = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly name: string,
    options?: Partial<CircuitBreakerOptions>
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get currentState(): CircuitBreakerState {
    return this.state;
  }

  get failureCount(): number {
    this.pruneOldFailures();
    return this.failures.length;
  }

  /**
   * Check if a request is allowed through the circuit breaker.
   * Returns true if the request should proceed, false if the circuit is open.
   */
  canExecute(): boolean {
    switch (this.state) {
      case CircuitBreakerState.Closed:
        return true;

      case CircuitBreakerState.Open: {
        const now = Date.now();
        if (now - this.lastFailureTime >= this.options.resetTimeout) {
          this.transitionTo(CircuitBreakerState.HalfOpen);
          return true;
        }
        return false;
      }

      case CircuitBreakerState.HalfOpen:
        // Allow limited requests through for probing
        return true;
    }
  }

  /**
   * Record a successful execution.
   */
  onSuccess(): void {
    switch (this.state) {
      case CircuitBreakerState.HalfOpen:
        this.halfOpenSuccesses++;
        if (
          this.halfOpenSuccesses >= this.options.halfOpenSuccessThreshold
        ) {
          this.transitionTo(CircuitBreakerState.Closed);
        }
        break;

      case CircuitBreakerState.Closed:
        // Reset failure count on success in closed state
        break;
    }
  }

  /**
   * Record a failed execution.
   */
  onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;

    switch (this.state) {
      case CircuitBreakerState.HalfOpen:
        // Any failure in half-open reopens the circuit
        this.transitionTo(CircuitBreakerState.Open);
        break;

      case CircuitBreakerState.Closed:
        this.failures.push(now);
        this.pruneOldFailures();
        if (this.failures.length >= this.options.failureThreshold) {
          this.transitionTo(CircuitBreakerState.Open);
        }
        break;
    }
  }

  /**
   * Force reset the circuit breaker to closed state.
   */
  reset(): void {
    this.transitionTo(CircuitBreakerState.Closed);
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;

    switch (newState) {
      case CircuitBreakerState.Closed:
        this.failures = [];
        this.halfOpenSuccesses = 0;
        break;
      case CircuitBreakerState.HalfOpen:
        this.halfOpenSuccesses = 0;
        break;
    }

    this.logger.warn(
      `Circuit breaker [${this.name}] transitioned: ${oldState} -> ${newState}`
    );
  }

  private pruneOldFailures(): void {
    const cutoff = Date.now() - this.options.windowSize;
    this.failures = this.failures.filter(t => t > cutoff);
  }
}
