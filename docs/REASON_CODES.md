# Reason codes

Canonical order is the order below and in `contracts/v1.json`. Codes are unique and machine-readable.

## Hard suppression

`schema_invalid`, `source_hash_mismatch`, `owner_mismatch`, `kind_disallowed`, `source_too_small`, `source_too_large`, `failed_execution`, `success_unverified`, `capability_undeclared`, `capability_forbidden`, `capability_disallowed`, `capability_widened`, `embedded_secret_risk`, `external_write_without_rollback`, `nondeterminism_uncontrolled`, `concrete_literal_only`, `owner_intervention`, `retries_exceeded`, `post_abstraction_replay_failed`, `duplicate_exact`, `duplicate_near`, `candidate_budget_exceeded`.

## Review and descriptive signals

`high_authority_inline_only`, `nonportable`, `success_verified`, `parameterized_input`, `explicit_marker_present`, `novel_family`, `capability_subset`, `needs_corroboration`, `distinct_input_corroboration`, `post_abstraction_replay_passed`, `owner_auto_enable_allowed`, `owner_auto_enable_forbidden`.

Reason presence explains evidence and gates; it is not a confidence score. Consumers must route on `disposition` and may use reasons for review UI or audit logs.
