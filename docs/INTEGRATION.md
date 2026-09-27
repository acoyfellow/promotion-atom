# Integration guide

Integrations translate native receipts into five plain JSON types defined in `contracts/v1.json`.

## Adapter facts

An adapter supplies:

- exact source and SHA-256;
- authenticated owner scope;
- declared and actually executed capabilities;
- success/failure and objective verification signals;
- stable receipt, input, result, and structure fingerprints;
- intervention and retry counts;
- side-effect and replay classifications;
- a bounded owner-scoped catalog snapshot;
- an explicit complete policy with no hidden defaults.

Do not copy native product objects into the core or let an adapter supply a disposition hint.

## Safe call sequence

1. Authenticate and authorize the owner outside the core.
2. Redact private payloads and convert receipts to the public schema.
3. Construct a bounded catalog for exactly one owner.
4. Call `evaluatePromotion` synchronously.
5. Display or persist the decision outside the core.
6. If a separate owner-controlled system acts on `activationEligible`, revalidate source identity and authority there.

## Private replay

Private replays should live outside the repository. Commit only license-clean synthetic analogs. Record hashes and aggregate outcomes rather than source, prompts, owner identities, or raw receipts.

## Compatibility

Unknown versions fail closed. Required-field changes require a new schema version. Additive reason codes require a corpus decision diff and updated freeze record.
