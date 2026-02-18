# ADR-0003: Multi-Provider AI Architecture with Circuit Breakers

## Status
Accepted

## Context
The AI copilot feature needs to support multiple LLM providers (OpenAI, Anthropic, Gemini, FAL, Perplexity, Morph) with different capabilities (text, images, embeddings, structured output). Provider outages should not cascade to users.

## Decision
We implement a **provider factory pattern** with:

1. **Provider abstraction**: Each provider extends `CopilotProvider<Config>` with capability-based matching.
2. **Factory resolution**: `CopilotProviderFactory.getProvider(conditions)` selects the best provider based on required output type, input type, and model ID.
3. **Circuit breaker**: Each provider has an independent circuit breaker (Closed -> Open -> HalfOpen) that tracks failures in a sliding window. When a provider's circuit opens, the factory automatically falls back to alternative providers.
4. **Scenario-based model selection**: Different use cases (chat, coding, embedding, image) can specify preferred models via configuration.

### Circuit Breaker States:
- **Closed** (normal): All requests pass through. Failures counted in sliding window.
- **Open** (failing): Requests fail fast. After `resetTimeout`, transitions to HalfOpen.
- **HalfOpen** (probing): Limited requests pass through. Success closes circuit; failure reopens.

## Consequences
- **Positive**: Provider outages are isolated. Automatic failover. Per-scenario optimization.
- **Negative**: Provider-specific features may not be available during fallback. Latency increases during failover probing.
- **Mitigation**: Health metrics expose circuit state. Admin can force-reset circuits.
