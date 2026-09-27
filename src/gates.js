import { sourceHash } from "./canonical.js";

export const GATE_ORDER = ["schema_valid","owner_isolated","source_bound","kind_allowed","source_quality","execution_successful","authority_bounded","static_findings_clear","intervention_bounded","history_bounded"];

const result = (gate, reasons) => ({ gate, passed: reasons.length === 0, reasons });
const subset = (left, right) => left.every((value) => right.includes(value));
const forbidden = (caps, prefixes) => caps.some((cap) => prefixes.some((prefix) => cap.startsWith(prefix)));
const byteLength = (text) => new TextEncoder().encode(text.normalize("NFC")).length;

export function evaluateGates(candidate, evidence, catalog, policy, keys, schemaValid = true) {
  const gates = [];
  gates.push(result("schema_valid", schemaValid ? [] : ["schema_invalid"]));
  if (!schemaValid) {
    for (const gate of GATE_ORDER.slice(1)) gates.push({ gate, passed: false, reasons: [] });
    return gates;
  }

  gates.push(result("owner_isolated", candidate.owner === policy.owner && catalog.owner === policy.owner && evidence.every((item) => item.owner === policy.owner) ? [] : ["owner_mismatch"]));

  const sourceReasons = [];
  if (sourceHash(candidate.source) !== candidate.sourceHash || evidence.some((item) => item.candidateSourceHash !== candidate.sourceHash)) sourceReasons.push("source_hash_mismatch");
  gates.push(result("source_bound", sourceReasons));

  gates.push(result("kind_allowed", policy.allowedKinds.includes(candidate.kind) ? [] : ["kind_disallowed"]));

  const quality = [];
  const size = byteLength(candidate.source);
  if (size < policy.minSourceBytes) quality.push("source_too_small");
  if (size > policy.maxSourceBytes) quality.push("source_too_large");
  if (candidate.signals.concreteLiteralOnly) quality.push("concrete_literal_only");
  gates.push(result("source_quality", quality));

  const execution = [];
  const successes = evidence.filter((item) => item.outcome === "ok");
  if (successes.length === 0 || evidence.some((item) => item.outcome !== "ok")) execution.push("failed_execution");
  if (successes.length > 0 && !successes.every((item) => item.verification.some((signal) => signal.kind === "objective-eval" && signal.ok))) execution.push("success_unverified");
  gates.push(result("execution_successful", execution));

  const authority = [];
  const executed = [...new Set(evidence.flatMap((item) => item.executedCapabilities))];
  if (!subset(executed, candidate.declaredCapabilities)) authority.push("capability_undeclared");
  if (!subset(candidate.declaredCapabilities, policy.allowedCapabilities)) authority.push("capability_disallowed");
  if (forbidden([...candidate.declaredCapabilities, ...executed], policy.forbiddenCapabilityPrefixes)) authority.push("capability_forbidden");
  const widened = catalog.entries.some((entry) => entry.familyKey === keys.familyKey && entry.declaredCapabilities.length < candidate.declaredCapabilities.length && subset(entry.declaredCapabilities, candidate.declaredCapabilities));
  if (widened) authority.push("capability_widened");
  gates.push(result("authority_bounded", authority));

  const findings = [];
  if (candidate.signals.embeddedSecretRisk) findings.push("embedded_secret_risk");
  if (candidate.signals.externalWriteWithoutRollback || evidence.some((item) => item.sideEffectClass === "external-write")) findings.push("external_write_without_rollback");
  if (candidate.signals.nondeterminismRisk) findings.push("nondeterminism_uncontrolled");
  gates.push(result("static_findings_clear", findings));

  const intervention = [];
  if (evidence.some((item) => item.interventionCount > 0)) intervention.push("owner_intervention");
  if (evidence.some((item) => item.retryCount > policy.maxRetriesForReview)) intervention.push("retries_exceeded");
  gates.push(result("intervention_bounded", intervention));

  const history = [];
  if (catalog.recentCandidateCount >= policy.maxCandidatesPerWindow) history.push("candidate_budget_exceeded");
  const exact = catalog.entries.some((entry) => entry.candidateKey === keys.candidateKey);
  const near = catalog.entries.some((entry) => entry.familyKey === keys.familyKey && entry.candidateKey !== keys.candidateKey);
  if (exact) history.push("duplicate_exact");
  else if (near) history.push("duplicate_near");
  gates.push(result("history_bounded", history));
  return gates;
}
