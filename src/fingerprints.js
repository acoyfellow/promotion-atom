import { canonicalJSON, sha256OfCanonical, sortedUnique } from "./canonical.js";

export function candidateKey(candidate) {
  return sha256OfCanonical([
    candidate.owner,
    candidate.kind,
    candidate.sourceHash,
    sortedUnique(candidate.declaredCapabilities),
  ]);
}

export function familyKey(candidate, dedupedEvidence) {
  const fps = sortedUnique(
    dedupedEvidence.map((e) => e.structureFingerprint),
  );
  return sha256OfCanonical([candidate.owner, candidate.kind, fps]);
}

export function inputDigest(candidate, dedupedEvidence, catalog, policy) {
  const normalizedCandidate = { ...candidate, declaredCapabilities: sortedUnique(candidate.declaredCapabilities) };
  const normalizedEvidence = dedupedEvidence.map((item) => ({
    ...item,
    executedCapabilities: sortedUnique(item.executedCapabilities),
    verification: [...item.verification].sort((a, b) => {
      const left = canonicalJSON(a), right = canonicalJSON(b);
      return left < right ? -1 : left > right ? 1 : 0;
    }),
  }));
  const normalizedCatalog = {
    ...catalog,
    entries: catalog.entries.map((entry) => ({ ...entry, declaredCapabilities: sortedUnique(entry.declaredCapabilities) })).sort((a, b) => {
      const left = canonicalJSON(a), right = canonicalJSON(b);
      return left < right ? -1 : left > right ? 1 : 0;
    }),
  };
  const normalizedPolicy = {
    ...policy,
    allowedKinds: sortedUnique(policy.allowedKinds),
    allowedCapabilities: sortedUnique(policy.allowedCapabilities),
    autoEnableCapabilities: sortedUnique(policy.autoEnableCapabilities),
    forbiddenCapabilityPrefixes: sortedUnique(policy.forbiddenCapabilityPrefixes),
  };
  return sha256OfCanonical([normalizedCandidate, normalizedEvidence, normalizedCatalog, normalizedPolicy]);
}
