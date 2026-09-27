# North star

## Falsifiable hypothesis

A deterministic evaluator can recognize useful no-marker reusable-tool candidates while keeping owner-visible noise and authority risk bounded.

## Required proof

1. At least one safe, recurring, no-marker fixture reaches `review`.
2. One-off, duplicate, invalid, and authority-widening fixtures remain `suppress` or require explicit review according to frozen policy.
3. A single successful run is never activation-eligible.
4. High-authority or nonportable artifacts are never activation-eligible.
5. Decisions are byte-stable, receipt-order invariant, and duplicate-receipt idempotent.
6. A private read-only adapter can evaluate recorded campaign evidence without modifying its source system.
7. Independent security, API, provenance, and proof critics report zero must-fix objections.

## Non-goals for v1

- Execute candidate code.
- Persist or activate tools.
- Call an LLM.
- Build a registry, sandbox, vector database, UI, or hosted service.
- Publish a package or repository.
- Claim semantic correctness from static analysis alone.
