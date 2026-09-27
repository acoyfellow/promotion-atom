# Architecture

`evaluatePromotion(candidate, evidence, catalog, policy)` is the only decision entrypoint.

## Modules

- `canonical.js`: portable canonical JSON and SHA-256.
- `schema.js`: strict v1 validation; unknown fields and versions fail closed.
- `fingerprints.js`: owner-scoped candidate, family, and complete-input digests.
- `gates.js`: ten fixed-order hard gates.
- `evaluate.js`: receipt collapse, signals, routing, reasons, and advisory activation eligibility.
- `index.js`: public exports.

## Data flow

1. Validate all JSON inputs without defaults.
2. Collapse byte-identical receipt IDs; conflicting duplicates are invalid.
3. Canonicalize set-like arrays and evidence/catalog ordering.
4. Compute owner-scoped exact and family identities.
5. Evaluate every hard gate without short-circuiting.
6. Add structured positive and review signals.
7. Route to `suppress`, `review`, or `promote`.
8. Compute advisory `activationEligible`; perform no activation.

## Trust boundary

Adapters attest source bytes/hashes, owner, execution outcome, executed capabilities, verification, side-effect class, replay status, and structural/input fingerprints. The core does not independently prove those facts. It derives gates and decisions from supplied facts and fails closed on contradictions.

The core imports only relative modules and uses portable JavaScript APIs. Persistence, execution, extraction, authentication, freshness, rollback, and catalog construction remain outside the package.
