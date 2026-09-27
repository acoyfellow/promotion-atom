# Contract v1 freeze

The machine-readable freeze is `contracts/v1.json`, with policy constants in `policies/v1.json` and expected corpus decisions in `corpus/v1-manifest.json`.

## Boundary

`evaluatePromotion(candidate, evidence, catalog, policy)` is synchronous, total, deterministic, and JSON-only. It performs no I/O, model call, clock read, random operation, execution, persistence, registry update, or activation. Invalid inputs return `suppress` with `schema_invalid`; the evaluator does not throw for data errors.

Adapters attest plain facts. The core derives identity, family, gates, reasons, disposition, and activation eligibility. Marker presence, prose, and extractor identity are untrusted signals and cannot bypass any gate.

## Deliberate cuts

- No timestamps, similarity threshold, embeddings, confidence score, signatures, multi-signer trust, free-text output, or hidden defaults.
- Evidence order is irrelevant. Duplicate `receiptId` values collapse deterministically.
- Family fingerprints are opaque adapter facts; the core groups only exact fingerprint equality and records its own family key.
- Windowing is an explicit catalog count, not a hidden clock.
- Static findings are adapter-supplied booleans. The core does not claim semantic correctness or scan source language.
- Promotion and activation remain separate. `activationEligible` is advisory data; this package cannot activate anything.

## Compatibility

`schemaVersion: 1` is exact. Unknown versions and unknown fields fail closed. Optional additive input fields and add-only reason codes are allowed only after a corpus decision diff. Required-field changes, removals, or renamed reasons require a new schema version.

## Freeze rule

Any change to contract fields, routing semantics, policy constants, fixture IDs, expected dispositions, activation flags, or required/forbidden reasons requires a new reconciliation and a recorded old/new freeze hash before implementation continues.
