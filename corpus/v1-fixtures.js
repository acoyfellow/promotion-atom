import { sourceHash } from "../src/canonical.js";
import { candidateKey, familyKey } from "../src/fingerprints.js";

export const policy = Object.freeze({
  schemaVersion:1, policyVersion:"v1-personal-readonly-review", owner:"owner:synthetic",
  allowedKinds:["procedure","prompt","skill","tool"],
  allowedCapabilities:["compute.pure","fs.read","fs.writeBounded","http.get.allowlisted"],
  autoEnableCapabilities:["compute.pure","fs.read"],
  forbiddenCapabilityPrefixes:["cloudbox.","exec.arbitrary","machine.","net.","secret."],
  maxSourceBytes:16384, minSourceBytes:64, maxCandidatesPerWindow:3, historyWindowSize:32,
  minDistinctInputsForPromote:2, minIndependentSuccessesForPromote:2, maxRetriesForReview:0,
  requireObjectiveVerificationForPromote:true, requireReplayForPromote:true, autoEnable:false,
});

const longSource = (id) => `export function ${id}(input) {\n  const normalized = String(input).trim();\n  return { value: normalized, reusable: true };\n}`;
const signals = (overrides={}) => ({ explicitMarker:false, parameterizedInput:true, embeddedSecretRisk:false, nondeterminismRisk:false, externalWriteWithoutRollback:false, concreteLiteralOnly:false, ...overrides });
const makeCandidate = (id, overrides={}) => {
  const source = overrides.source ?? longSource(id);
  const rest = { ...overrides }; delete rest.source;
  return { schemaVersion:1, owner:"owner:synthetic", kind:"tool", source, sourceHash:sourceHash(source), language:"javascript", declaredCapabilities:["fs.read"], portable:true, signals:signals(), extraction:{source:"runtime"}, ...rest };
};
const makeEvidence = (candidate, id, overrides={}) => ({ schemaVersion:1, receiptId:id, owner:"owner:synthetic", candidateSourceHash:candidate.sourceHash, structureFingerprint:`family:${candidate.source.split("(")[0]}`, inputFingerprint:`input:${id}`, resultFingerprint:`result:${id}`, outcome:"ok", executedCapabilities:[...candidate.declaredCapabilities], verification:[{kind:"objective-eval",ok:true}], interventionCount:0, retryCount:0, sideEffectClass:"read", replay:"not-run", provenance:{harness:"synthetic"}, ...overrides });
const emptyCatalog = (overrides={}) => ({ schemaVersion:1, owner:"owner:synthetic", entries:[], recentCandidateCount:0, ...overrides });
const entryFor = (candidate, evidence, overrides={}) => ({ candidateKey:candidateKey(candidate), familyKey:familyKey(candidate,evidence), declaredCapabilities:[...candidate.declaredCapabilities], status:"reviewable", evidenceCount:1, distinctInputCount:1, ...overrides });
const fixture = (id, candidate, evidence, catalog=emptyCatalog()) => ({ id, candidate, evidence, catalog, policy:{...policy} });

const fixtures = [];
{
  const c=makeCandidate("noMarkerReview"); const e=[makeEvidence(c,"f01-r1")]; fixtures.push(fixture("F01_no_marker_recurring_review",c,e));
}
{
  const c=makeCandidate("markerNoBypass",{declaredCapabilities:["machine.shell"],signals:signals({explicitMarker:true})}); const e=[makeEvidence(c,"f02-r1")]; fixtures.push(fixture("F02_marker_present_no_bypass",c,e));
}
{
  const c=makeCandidate("singleSuccess"); const e=[makeEvidence(c,"f03-r1")]; fixtures.push(fixture("F03_single_success_never_activates",c,e));
}
{
  const c=makeCandidate("safeCorroborated"); const e=[makeEvidence(c,"f04-r1",{replay:"passed",inputFingerprint:"alpha"}),makeEvidence(c,"f04-r2",{replay:"passed",inputFingerprint:"beta"})]; fixtures.push(fixture("F04_safe_corroborated_promote",c,e));
}
{
  const c=makeCandidate("oneOffLiteral",{signals:signals({parameterizedInput:false,concreteLiteralOnly:true})}); const e=[makeEvidence(c,"f05-r1")]; fixtures.push(fixture("F05_one_off_absolute_literal",c,e));
}
{
  const c=makeCandidate("trivial",{source:"x"}); const e=[makeEvidence(c,"f06-r1",{outcome:"error",verification:[],replay:"not-run"})]; fixtures.push(fixture("F06_trivial_failed_run",c,e));
}
{
  const c=makeCandidate("exactDuplicate"); const e=[makeEvidence(c,"f07-r1")]; const cat=emptyCatalog({entries:[entryFor(c,e)]}); fixtures.push(fixture("F07_duplicate_exact",c,e,cat));
}
{
  const c=makeCandidate("nearDuplicate"); const e=[makeEvidence(c,"f08-r1")]; const prior={...entryFor(c,e),candidateKey:"different-candidate-key"}; fixtures.push(fixture("F08_duplicate_near_family",c,e,emptyCatalog({entries:[prior]})));
}
{
  const c=makeCandidate("authorityWidened",{declaredCapabilities:["fs.read","fs.writeBounded"]}); const e=[makeEvidence(c,"f09-r1")]; const prior={...entryFor(c,e),candidateKey:"prior-key",declaredCapabilities:["fs.read"]}; fixtures.push(fixture("F09_authority_widened_on_reuse",c,e,emptyCatalog({entries:[prior]})));
}
{
  const c=makeCandidate("highAuthority",{declaredCapabilities:["fs.writeBounded"],portable:false}); const e=[makeEvidence(c,"f10-r1")]; fixtures.push(fixture("F10_high_authority_nonportable",c,e));
}
{
  const c=makeCandidate("intervenedRetry"); const e=[makeEvidence(c,"f11-r1",{interventionCount:1,retryCount:1})]; fixtures.push(fixture("F11_owner_intervention_retry",c,e));
}
{
  const c=makeCandidate("generalizedReplay"); const e=[makeEvidence(c,"f12-r1",{replay:"passed",inputFingerprint:"gamma"}),makeEvidence(c,"f12-r2",{replay:"passed",inputFingerprint:"delta"})]; fixtures.push(fixture("F12_generalized_replay_passed",c,e));
}
{
  const c=makeCandidate("failedReplay"); const e=[makeEvidence(c,"f13-r1",{replay:"failed"})]; fixtures.push(fixture("F13_generalized_replay_failed",c,e));
}
{
  const c=makeCandidate("secretExfil",{signals:signals({embeddedSecretRisk:true,externalWriteWithoutRollback:true})}); const e=[makeEvidence(c,"f14-r1",{sideEffectClass:"external-write"})]; fixtures.push(fixture("F14_embedded_secret_exfiltration",c,e));
}
{
  const c=makeCandidate("nondeterministic",{signals:signals({nondeterminismRisk:true})}); const e=[makeEvidence(c,"f15-r1")]; fixtures.push(fixture("F15_nondeterminism_uncontrolled",c,e));
}
{
  const c=makeCandidate("ownerFlood",{owner:"owner:other"}); const e=[makeEvidence(c,"f16-r1")]; const prior={...entryFor(c,e),candidateKey:"other-key"}; fixtures.push(fixture("F16_flood_owner_isolation_budget",c,e,emptyCatalog({entries:[prior],recentCandidateCount:3})));
}

export const syntheticFixtures = Object.freeze(fixtures);
