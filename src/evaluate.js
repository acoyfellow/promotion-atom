import { canonicalJSON, sha256Hex, sha256OfCanonical, sortedUnique } from "./canonical.js";
import { candidateKey, familyKey, inputDigest } from "./fingerprints.js";
import { evaluateGates } from "./gates.js";
import { validateCandidate, validateEvidenceList, validateCatalog, validatePolicy } from "./schema.js";

const REASON_ORDER = ["schema_invalid","source_hash_mismatch","owner_mismatch","kind_disallowed","source_too_small","source_too_large","failed_execution","success_unverified","capability_undeclared","capability_forbidden","capability_disallowed","capability_widened","embedded_secret_risk","external_write_without_rollback","nondeterminism_uncontrolled","concrete_literal_only","owner_intervention","retries_exceeded","post_abstraction_replay_failed","duplicate_exact","duplicate_near","candidate_budget_exceeded","high_authority_inline_only","nonportable","success_verified","parameterized_input","explicit_marker_present","novel_family","capability_subset","needs_corroboration","distinct_input_corroboration","post_abstraction_replay_passed","owner_auto_enable_allowed","owner_auto_enable_forbidden"];
const SUPPRESS = new Set(REASON_ORDER.slice(0, 22));
const orderReasons = (values) => REASON_ORDER.filter((reason) => values.has(reason));

function dedupeEvidence(evidence) {
  const groups = new Map();
  for (const item of evidence) {
    const encoded = canonicalJSON(item);
    const prior = groups.get(item.receiptId);
    if (prior && prior.encoded !== encoded) return { ok: false, items: [] };
    if (!prior) groups.set(item.receiptId, { encoded, item });
  }
  return { ok: true, items: [...groups.values()].map(({ item }) => item).sort((a, b) => a.receiptId < b.receiptId ? -1 : a.receiptId > b.receiptId ? 1 : 0) };
}

function invalidDecision(candidate, evidence, catalog, policy) {
  let digest;
  try { digest = sha256OfCanonical([candidate, evidence, catalog, policy]); }
  catch { digest = sha256Hex("invalid-json-input"); }
  return {
    schemaVersion: 1,
    disposition: "suppress",
    candidateKey: "",
    familyKey: "",
    policyVersion: typeof policy?.policyVersion === "string" ? policy.policyVersion : "",
    inputDigest: digest,
    reasons: ["schema_invalid"],
    gates: evaluateGates({}, [], {}, {}, {}, false),
    evidenceRefs: [],
    activationEligible: false,
    nextEvidenceNeeded: [],
  };
}

export function evaluatePromotion(candidate, evidence, catalog, policy) {
  const schemaOk = validateCandidate(candidate).ok && validateEvidenceList(evidence).ok && validateCatalog(catalog).ok && validatePolicy(policy).ok;
  if (!schemaOk) return invalidDecision(candidate, evidence, catalog, policy);
  const deduped = dedupeEvidence(evidence);
  if (!deduped.ok) {
    const orderInvariantEvidence = [...evidence].sort((a, b) => {
      const left = canonicalJSON(a), right = canonicalJSON(b);
      return left < right ? -1 : left > right ? 1 : 0;
    });
    return invalidDecision(candidate, orderInvariantEvidence, catalog, policy);
  }

  const keys = { candidateKey: candidateKey(candidate), familyKey: familyKey(candidate, deduped.items) };
  const gates = evaluateGates(candidate, deduped.items, catalog, policy, keys, true);
  const reasons = new Set(gates.flatMap((gate) => gate.reasons));
  const successes = deduped.items.filter((item) => item.outcome === "ok");
  const verified = successes.length > 0 && successes.every((item) => item.verification.some((signal) => signal.kind === "objective-eval" && signal.ok));
  if (verified) reasons.add("success_verified");
  if (candidate.signals.parameterizedInput) reasons.add("parameterized_input");
  if (candidate.signals.explicitMarker) reasons.add("explicit_marker_present");
  if (!catalog.entries.some((entry) => entry.familyKey === keys.familyKey)) reasons.add("novel_family");
  const allExecuted = sortedUnique(deduped.items.flatMap((item) => item.executedCapabilities));
  const capabilitySubset = allExecuted.every((cap) => candidate.declaredCapabilities.includes(cap)) && candidate.declaredCapabilities.every((cap) => policy.allowedCapabilities.includes(cap));
  if (capabilitySubset) reasons.add("capability_subset");
  const distinctInputs = new Set(successes.map((item) => item.inputFingerprint).filter((value) => typeof value === "string" && value.length > 0));
  const consistentStructure = new Set(successes.map((item) => item.structureFingerprint)).size === 1;
  const corroborated = consistentStructure && successes.length >= policy.minIndependentSuccessesForPromote && distinctInputs.size >= policy.minDistinctInputsForPromote;
  if (corroborated) reasons.add("distinct_input_corroboration");
  const replayFailed = deduped.items.some((item) => item.replay === "failed");
  const replayPassed = successes.length > 0 && successes.every((item) => item.replay === "passed");
  if (replayFailed) reasons.add("post_abstraction_replay_failed");
  else if (replayPassed) reasons.add("post_abstraction_replay_passed");
  if (!candidate.portable) reasons.add("nonportable");
  const highAuthority = candidate.declaredCapabilities.some((cap) => !policy.autoEnableCapabilities.includes(cap));
  if (highAuthority) reasons.add("high_authority_inline_only");

  const hardFailure = [...reasons].some((reason) => SUPPRESS.has(reason));
  const objectiveReady = !policy.requireObjectiveVerificationForPromote || verified;
  const replayReady = !policy.requireReplayForPromote || replayPassed;
  const promotable = !hardFailure && corroborated && objectiveReady && replayReady;
  const disposition = hardFailure ? "suppress" : promotable ? "promote" : "review";
  if (disposition === "review") reasons.add("needs_corroboration");

  const autoCaps = [...candidate.declaredCapabilities, ...allExecuted].every((cap) => policy.autoEnableCapabilities.includes(cap));
  const activationEligible = disposition === "promote" && policy.autoEnable && candidate.portable && autoCaps && !highAuthority;
  if (disposition === "promote") reasons.add(activationEligible ? "owner_auto_enable_allowed" : "owner_auto_enable_forbidden");

  const next = [];
  if (disposition === "review") {
    if (distinctInputs.size < policy.minDistinctInputsForPromote) next.push("distinct-input");
    if (!objectiveReady) next.push("objective-verification");
    if (!replayReady) next.push("post-abstraction-replay");
    if (highAuthority) next.push("narrower-capability");
  }
  return {
    schemaVersion: 1,
    disposition,
    candidateKey: keys.candidateKey,
    familyKey: keys.familyKey,
    policyVersion: policy.policyVersion,
    inputDigest: inputDigest(candidate, deduped.items, catalog, policy),
    reasons: orderReasons(reasons),
    gates,
    evidenceRefs: deduped.items.map((item) => item.receiptId),
    activationEligible,
    nextEvidenceNeeded: [...new Set(next)].sort(),
  };
}

export function serializeDecision(decision) {
  return canonicalJSON(decision);
}
