# Threat model

## Protected properties

- A marker, prompt claim, name, description, or extractor identity cannot bypass a gate.
- Evidence must bind to the candidate source and owner.
- Executed authority must be declared and policy-allowed.
- Forbidden or widened authority cannot improve a decision.
- A single success, high-authority artifact, or nonportable artifact cannot become activation-eligible.
- Duplicate floods and full review windows suppress new review noise.
- Conflicting duplicate receipts fail closed.
- External writes suppress in v1 because no rollback-proof field exists.

## Untrusted inputs

All four inputs are untrusted JSON, including adapter findings and model-produced candidate metadata. Unknown fields, unknown versions, malformed values, source/hash mismatches, owner mismatches, and contradictory receipts return `suppress`.

## Adapter responsibilities

Adapters authenticate owners and receipt provenance, redact secrets, compute source and structural facts reproducibly, provide actual executed capabilities, classify side effects, and prevent cross-owner catalog construction. The core cannot detect a lying adapter that supplies internally consistent false facts.

## Denial of service

A poisoned catalog can suppress legitimate review items but cannot promote one. Catalog authenticity and availability are caller responsibilities. Source and history bounds limit work per call; callers must bound input payloads before invoking the core.

## Non-goals

This package does not execute or sandbox code, establish semantic correctness, scan arbitrary languages, authenticate signatures, persist state, roll back writes, or activate tools.
